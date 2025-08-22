package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

type Envelope struct {
	Type    string                 `json:"type"`
	SHA256  string                 `json:"sha256"`
	CID     string                 `json:"cid,omitempty"`
	URL     string                 `json:"url,omitempty"`
	SigURL  string                 `json:"sig_url,omitempty"`
	CertURL string                 `json:"cert_url,omitempty"`
	Module  string                 `json:"module,omitempty"`
	Entry   string                 `json:"entry,omitempty"`
	Inputs  map[string]any         `json:"inputs,omitempty"`
	Caps    []string               `json:"caps,omitempty"`
	Limits  map[string]any         `json:"limits,omitempty"`
	Policy  map[string]any         `json:"policy,omitempty"`
	Meta    map[string]any         `json:"meta,omitempty"`
}

type Config struct {
	RelayBase   string
	SSEPath     string
	EventPost   string
	IPFSGateway string
	CacheDir    string
	PromAddr    string
	Concurrency int
	DefaultTO   time.Duration
	MaxMemMB    uint32

	AllowModules []string
	AllowCaps    []string

	CosignVerify bool
	OPABase      string
	OPADecision  string

	DryRun bool
}

var (
	reg           = prometheus.NewRegistry()
	runsTotal     = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "void_wasm_runs_total", Help: "WASM runs"}, []string{"result","module"})
	runMs         = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "void_wasm_duration_ms", Buckets: []float64{50,100,200,400,800,1500,3000,6000}}, []string{"module"})
	policyDenied  = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_policy_denied_total", Help: "Policy denies"})
	cosignTotal   = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "void_wasm_cosign_total", Help: "Cosign verify"}, []string{"result"})
	opaTotal      = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "void_wasm_opa_total", Help: "OPA decision"}, []string{"result"})
	stdoutEvents  = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_stdout_events_total", Help: "Events from stdout"})
	sseReconnects = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_sse_reconnects_total", Help: "SSE reconnects"})
	activeGauge   = prometheus.NewGauge(prometheus.GaugeOpts{Name: "void_wasm_active", Help: "Active runs"})
)

func mustRegister() {
	reg.MustRegister(runsTotal, runMs, policyDenied, cosignTotal, opaTotal, stdoutEvents, sseReconnects, activeGauge)
}

func getenv(key, def string) string { v := os.Getenv(key); if v == "" { return def }; return v }

func loadConfig() Config {
	atoi := func(s string, d int) int { var n int; if _,err:=fmt.Sscanf(s,"%d",&n); err!=nil { return d }; return n }
	parse := func(s string) []string {
		out := []string{}
		for _, p := range strings.Split(s, ",") { p = strings.TrimSpace(p); if p != "" { out = append(out, p) } }
		return out
	}
	return Config{
		RelayBase:    strings.TrimRight(getenv("RELAY_BASE", "http://relay:8787"), "/"),
		SSEPath:      getenv("SSE_PATH", "/sse"),
		EventPost:    getenv("EVENT_POST", "/event"),
		IPFSGateway:  strings.TrimRight(getenv("IPFS_GATEWAY", "https://ipfs.io"), "/"),
		CacheDir:     getenv("CACHE_DIR", "/tmp/void/wasm-cache"),
		PromAddr:     getenv("PROM_ADDR", ":9490"),
		Concurrency:  atoi(getenv("CONCURRENCY", "1"), 1),
		DefaultTO:    time.Duration(atoi(getenv("TIMEOUT_MS", "2000"), 2000)) * time.Millisecond,
		MaxMemMB:     uint32(atoi(getenv("MEM_MB", "128"), 128)),
		AllowModules: parse(getenv("ALLOW_MODULES", "wasm/ci/*,wasm/pulse/*")),
		AllowCaps:    parse(getenv("ALLOW_CAPS", "emit")),
		CosignVerify: getenv("COSIGN_VERIFY", "0") == "1",
		OPABase:      getenv("OPA_BASE", "http://opa-pdp:8181"),
		OPADecision:  getenv("OPA_DECISION", "/v1/data/void/policy/allow"),
		DryRun:       getenv("WASM_DRYRUN", "0") == "1",
	}
}

func main() {
	mustRegister()
	cfg := loadConfig()

	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.HandlerFor(reg, promhttp.HandlerOpts{}))
		mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200); w.Write([]byte("{\"ok\":true}")) })
		http.ListenAndServe(cfg.PromAddr, mux)
	}()

	os.MkdirAll(cfg.CacheDir, 0o755)

	sseURL := cfg.RelayBase + cfg.SSEPath
	fmt.Println("[wasm] SSE connect", sseURL)
	for {
		if err := sseLoop(cfg, sseURL); err != nil {
			fmt.Println("[wasm] SSE error:", err)
			sseReconnects.Inc()
			time.Sleep(2 * time.Second)
		}
	}
}

func sseLoop(cfg Config, sseURL string) error {
	resp, err := http.Get(sseURL)
	if err != nil { return err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return fmt.Errorf("sse status %d", resp.StatusCode) }
	rd := bufio.NewReader(resp.Body)
	for {
		line, err := rd.ReadString('\\n')
		if err != nil { return err }
		if !strings.HasPrefix(line, "data:") { continue }
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == ":" { continue }
		var env Envelope
		if json.Unmarshal([]byte(payload), &env) != nil { continue }
		if env.Type != "signal.wasm" { continue }
		go handleEnvelope(cfg, &env)
	}
}

func allowed(needle string, allow []string) bool {
	for _, a := range allow {
		a = strings.TrimSpace(a)
		if a == "" { continue }
		if strings.HasSuffix(a, "*") {
			if strings.HasPrefix(needle, strings.TrimSuffix(a, "*")) { return true }
		} else if a == needle {
			return true
		}
	}
	return false
}

func handleEnvelope(cfg Config, env *Envelope) {
	moduleName := env.Module
	if moduleName == "" { moduleName = "unknown" }
	if !allowed(moduleName, cfg.AllowModules) {
		policyDenied.Inc()
		runsTotal.WithLabelValues("deny_allowlist", moduleName).Inc()
		return
	}

	// fetch + cosign
	path, signer, err := fetchAndVerify(cfg, env)
	if err != nil {
		fmt.Println("[cosign/fetch] error:", err)
		runsTotal.WithLabelValues("download_or_verify_failed", moduleName).Inc()
		return
	}

	// OPA
	allowed, err := opaAllow(cfg, env, signer)
	if err != nil {
		opaTotal.WithLabelValues("error").Inc()
		runsTotal.WithLabelValues("opa_error", moduleName).Inc()
		return
	}
	if !allowed {
		policyDenied.Inc()
		opaTotal.WithLabelValues("deny").Inc()
		runsTotal.WithLabelValues("deny_policy", moduleName).Inc()
		return
	} else {
		opaTotal.WithLabelValues("allow").Inc()
	}

	if cfg.DryRun {
		runsTotal.WithLabelValues("dryrun", moduleName).Inc()
		return
	}

	// run
	ctx, cancel := context.WithTimeout(context.Background(), cfg.DefaultTO)
	defer cancel()
	activeGauge.Inc(); defer activeGauge.Dec()

	t0 := time.Now()
	err = runWasm(ctx, cfg, path, env)
	runMs.WithLabelValues(moduleName).Observe(float64(time.Since(t0).Milliseconds()))
	if err != nil {
		runsTotal.WithLabelValues("error", moduleName).Inc()
		return
	}
	runsTotal.WithLabelValues("ok", moduleName).Inc()
}

func fetchAndVerify(cfg Config, env *Envelope) (string, string, error) {
	// download
	path, data, err := download(cfg, env)
	if err != nil { return "", "", err }

	// sha
	if env.SHA256 != "" {
		sum := sha256.Sum256(data)
		if hex.EncodeToString(sum[:]) != strings.ToLower(env.SHA256) {
			return "", "", errors.New("sha256 mismatch")
		}
	}

	// cosign
	if !cfg.CosignVerify { return path, "", nil }
	signer, err := cosignVerify(env, path)
	if err != nil {
		cosignTotal.WithLabelValues("verify_failed").Inc()
		return "", "", err
	}
	cosignTotal.WithLabelValues("verified").Inc()
	return path, signer, nil
}

func download(cfg Config, env *Envelope) (string, []byte, error) {
	var src string
	if env.URL != "" { src = env.URL }
	if env.CID != "" && src == "" {
		cid := strings.TrimPrefix(env.CID, "ipfs://")
		src = cfg.IPFSGateway + "/ipfs/" + cid
	}
	if src == "" { return "", nil, errors.New("no url/cid provided") }

	if strings.HasPrefix(src, "file://") {
		p := strings.TrimPrefix(src, "file://")
		b, err := os.ReadFile(p)
		return p, b, err
	}
	resp, err := http.Get(src)
	if err != nil { return "", nil, err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return "", nil, fmt.Errorf("download status %d", resp.StatusCode) }
	b, err := io.ReadAll(resp.Body)
	if err != nil { return "", nil, err }
	// cache
	filename := env.SHA256
	if filename == "" { filename = strings.ReplaceAll(env.Module, "/", "_") }
	cached := filepath.Join(cfg.CacheDir, filename+".wasm")
	os.MkdirAll(filepath.Dir(cached), 0o755)
	_ = os.WriteFile(cached, b, 0o644)
	return cached, b, nil
}

func cosignVerify(env *Envelope, wasmPath string) (string, error) {
	// Collect sig/cert paths
	sigPath, crtPath := "", ""
	down := func(u string) (string, error) {
		resp, err := http.Get(u)
		if err != nil { return "", err }
		defer resp.Body.Close()
		if resp.StatusCode != 200 { return "", fmt.Errorf("status %d", resp.StatusCode) }
		dir := filepath.Join(os.TempDir(), "void", "cosign")
		os.MkdirAll(dir, 0o755)
		p := filepath.Join(dir, fmt.Sprintf("%d", time.Now().UnixNano()))
		b, _ := io.ReadAll(resp.Body)
		_ = os.WriteFile(p, b, 0o600)
		return p, nil
	}
	if env.SigURL != "" { p, err := down(env.SigURL); if err == nil { sigPath = p } }
	if env.CertURL != "" { p, err := down(env.CertURL); if err == nil { crtPath = p } }
	if sigPath == "" && strings.HasPrefix(env.URL, "file://") {
		base := strings.TrimPrefix(env.URL, "file://")
		if _, err := os.Stat(base+".sig"); err == nil { sigPath = base + ".sig" }
		if _, err := os.Stat(base+".crt"); err == nil { crtPath = base + ".crt" }
	}
	args := []string{"verify-blob", "--output=json"}
	if crtPath != "" { args += []string{"--certificate", crtPath} }
	if sigPath != "" { args += []string{"--signature", sigPath} }
	args = append(args, wasmPath)
	out, err := exec.Command("cosign", args...).CombinedOutput()
	if err != nil { return "", fmt.Errorf("cosign failed: %v (%s)", err, string(out)) }
	// parse signer best-effort
	type cert struct{ Email string `json:"email"`; Subject string `json:"subject"` }
	type outj struct { Cert cert `json:"cert"` }
	var cj outj
	_ = json.Unmarshal(out, &cj)
	if cj.Cert.Email != "" { return cj.Cert.Email, nil }
	return cj.Cert.Subject, nil
}

func opaAllow(cfg Config, env *Envelope, signer string) (bool, error) {
	if cfg.OPABase == "" { return true, nil }
	input := map[string]any{ "module": env.Module, "caps": env.Caps, "limits": env.Limits, "sha256": env.SHA256 }
	if signer != "" { input["signer"] = signer }
	body, _ := json.Marshal(map[string]any{"input": input})
	u := strings.TrimRight(cfg.OPABase, "/") + cfg.OPADecision
	req, _ := http.NewRequest("POST", u, bytes.NewReader(body))
	req.Header.Set("content-type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil { return false, err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return false, fmt.Errorf("opa status %d", resp.StatusCode) }
	var out struct { Result bool `json:"result"` }
	if json.NewDecoder(resp.Body).Decode(&out) != nil { return false, errors.New("bad OPA response") }
	return out.Result, nil
}

func runWasm(ctx context.Context, cfg Config, path string, env *Envelope) error {
	r := wazero.NewRuntime(ctx); defer r.Close(ctx)
	if _, err := wasi_snapshot_preview1.Instantiate(ctx, r); err != nil { return err }
	tmp := filepath.Join(os.TempDir(), "void", "exec", fmt.Sprintf("%d", time.Now().UnixNano()))
	os.MkdirAll(tmp, 0o755); defer os.RemoveAll(tmp)

	in := env.Inputs; if in == nil { in = map[string]any{} }
	b, _ := json.Marshal(in)
	stdin := bytes.NewReader(b)
	var stdout, stderr bytes.Buffer
	cfgMod := wazero.NewModuleConfig().WithStdout(&stdout).WithStderr(&stderr).WithStdin(stdin)
	_, err := r.InstantiateWithConfig(ctx, mustRead(path), cfgMod)
	if err != nil { return err }

	sc := bufio.NewScanner(&stdout)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" { continue }
		var ev map[string]any
		if json.Unmarshal([]byte(line), &ev) == nil { postEvent(cfg, ev); stdoutEvents.Inc() }
	}
	return sc.Err()
}

func mustRead(path string) []byte { b, err := os.ReadFile(path); if err != nil { panic(err) }; return b }

func postEvent(cfg Config, ev map[string]any) {
	url := cfg.RelayBase + cfg.EventPost
	body, _ := json.Marshal(ev)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("content-type", "application/json")
	http.DefaultClient.Do(req)
}
