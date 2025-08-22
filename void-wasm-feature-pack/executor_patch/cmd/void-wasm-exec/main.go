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
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

// Envelope received from relay
type Envelope struct {
	Type   string                 `json:"type"`
	SHA256 string                 `json:"sha256"`
	CID    string                 `json:"cid,omitempty"`
	URL    string                 `json:"url,omitempty"`
	Module string                 `json:"module,omitempty"`
	Entry  string                 `json:"entry,omitempty"`
	Inputs map[string]any         `json:"inputs,omitempty"`
	Caps   []string               `json:"caps,omitempty"`
	Limits map[string]any         `json:"limits,omitempty"`
	Policy map[string]any         `json:"policy,omitempty"`
	Meta   map[string]any         `json:"meta,omitempty"`
}

// Config via env/flags
type Config struct {
	RelayBase    string
	SSEPath      string
	EventPost    string
	IPFSGateway  string
	CacheDir     string
	PromAddr     string
	Concurrency  int
	DefaultTO    time.Duration
	MaxMemMB     uint32

	AllowModules []string
	AllowCaps    []string

	AllowHTTPHosts []string
	HTTPBurst      int
	HTTPRPS        int
	MaxHTTPKB      int

	CosignVerify bool
	DryRun       bool
}

var (
	reg            = prometheus.NewRegistry()
	runsTotal      = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "void_wasm_runs_total", Help: "WASM runs by result"}, []string{"result", "module"})
	runDuration    = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "void_wasm_duration_ms", Help: "Run duration ms", Buckets: []float64{50,100,200,400,800,1500,3000,6000,12000}}, []string{"module"})
	cacheHitTotal  = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_cache_hit_total", Help: "Cache hits"})
	downloadMs     = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "void_wasm_download_ms", Help: "Download ms", Buckets: []float64{5,10,20,50,100,200,400,800,1500}})
	policyDenied   = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_policy_denied_total", Help: "Policy denies"})
	stdoutEvents   = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_stdout_events_total", Help: "Events read from module stdout"})
	activeGauge    = prometheus.NewGauge(prometheus.GaugeOpts{Name: "void_wasm_active", Help: "Active runs"})
	sseReconnects  = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_sse_reconnects_total", Help: "SSE reconnects"})
	downloadsTotal = prometheus.NewCounter(prometheus.CounterOpts{Name: "void_wasm_downloads_total", Help: "Downloads attempted"})
	sysReqTotal    = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "void_wasm_syscalls_total", Help: "Syscalls by kind"}, []string{"kind","result"})
	sysDur         = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "void_wasm_syscall_ms", Help: "Syscall latency ms", Buckets: []float64{5,10,20,50,100,200,400,800,1500}}, []string{"kind"})
)

func mustRegister() {
	reg.MustRegister(runsTotal, runDuration, cacheHitTotal, downloadMs, policyDenied, stdoutEvents, activeGauge, sseReconnects, downloadsTotal, sysReqTotal, sysDur)
}

// naive allow matcher with '*' suffix support
func allowed(needle string, allow []string) bool {
	if len(allow) == 0 { return false }
	for _, a := range allow {
		if strings.HasSuffix(a, "*") {
			prefix := strings.TrimSuffix(a, "*")
			if strings.HasPrefix(needle, prefix) { return true }
		} else if a == needle {
			return true
		}
	}
	return false
}

func getenv(key, def string) string { v := os.Getenv(key); if v == "" { return def }; return v }

func loadConfig() Config {
	parseList := func(s string) []string {
		out := []string{}
		for _, p := range strings.Split(s, ",") {
			p = strings.TrimSpace(p)
			if p != "" { out = append(out, p) }
		}
		return out
	}
	atoi := func(s string, d int) int { var n int; if _,err:=fmt.Sscanf(s,"%d",&n); err!=nil { return d }; return n }

	cfg := Config{
		RelayBase:     strings.TrimRight(getenv("RELAY_BASE", "http://localhost:8787"), "/"),
		SSEPath:       getenv("SSE_PATH", "/sse"),
		EventPost:     getenv("EVENT_POST", "/event"),
		IPFSGateway:   strings.TrimRight(getenv("IPFS_GATEWAY", "https://ipfs.io"), "/"),
		CacheDir:      getenv("CACHE_DIR", "/tmp/void/wasm-cache"),
		PromAddr:      getenv("PROM_ADDR", ":9490"),
		Concurrency:   atoi(getenv("CONCURRENCY", "1"), 1),
		DefaultTO:     time.Duration(atoi(getenv("TIMEOUT_MS", "2000"), 2000)) * time.Millisecond,
		MaxMemMB:      uint32(atoi(getenv("MEM_MB", "128"), 128)),
		AllowModules:  parseList(getenv("ALLOW_MODULES", "wasm/ci/*,wasm/pulse/*")),
		AllowCaps:     parseList(getenv("ALLOW_CAPS", "emit")),
		AllowHTTPHosts: parseList(getenv("ALLOW_HTTP_HOSTS", "relay,localhost")),
		HTTPBurst:     atoi(getenv("HTTP_BURST", "5"), 5),
		HTTPRPS:       atoi(getenv("HTTP_RPS", "5"), 5),
		MaxHTTPKB:     atoi(getenv("HTTP_MAX_KB", "64"), 64),
		CosignVerify:  getenv("COSIGN_VERIFY", "0") == "1",
		DryRun:        getenv("WASM_DRYRUN", "0") == "1",
	}
	return cfg
}

func main() {
	mustRegister()
	cfg := loadConfig()

	// Flags still allowed for local runs
	flag.StringVar(&cfg.PromAddr, "prom", cfg.PromAddr, "metrics addr")
	flag.Parse()

	// /metrics server
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.HandlerFor(reg, promhttp.HandlerOpts{}))
		mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200); w.Write([]byte("{\"ok\":true}")) })
		http.ListenAndServe(cfg.PromAddr, mux)
	}()

	// ensure cache dir
	os.MkdirAll(cfg.CacheDir, 0o755)

	// SSE loop
	sseURL := cfg.RelayBase + cfg.SSEPath
	fmt.Println("[wasm] SSE connect", sseURL)
	for {
		if err := sseLoop(cfg, sseURL); err != nil {
			fmt.Println("[wasm] SSE error:", err)
			sseReconnects.Inc()
			time.Sleep(2 * time.Second)
			continue
		}
	}
}

func sseLoop(cfg Config, sseURL string) error {
	req, _ := http.NewRequest("GET", sseURL, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("sse status %d", resp.StatusCode)
	}
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return err
		}
		if !strings.HasPrefix(line, "data:") { continue }
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == ":" { continue }
		var env Envelope
		if err := json.Unmarshal([]byte(payload), &env); err != nil { continue }
		if env.Type != "signal.wasm" { continue }
		go handleEnvelope(cfg, &env)
	}
}

var sem = make(chan struct{}, 1) // concurrency limit

func handleEnvelope(cfg Config, env *Envelope) {
	sem <- struct{}{}; defer func(){ <-sem }()

	moduleName := env.Module
	if moduleName == "" { moduleName = "unknown" }
	if !allowed(moduleName, cfg.AllowModules) {
		fmt.Println("[policy] deny module", moduleName)
		policyDenied.Inc()
		return
	}
	path, err := fetchModule(cfg, env)
	if err != nil {
		fmt.Println("[wasm] fetch error:", err)
		runsTotal.WithLabelValues("download_error", moduleName).Inc()
		return
	}
	if cfg.DryRun {
		fmt.Println("[wasm] DRYRUN would run", moduleName, "from", path)
		runsTotal.WithLabelValues("dryrun", moduleName).Inc()
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.DefaultTO)
	defer cancel()
	activeGauge.Inc()
	defer activeGauge.Dec()

	start := time.Now()
	err = runWasm(ctx, cfg, path, env)
	runDuration.WithLabelValues(moduleName).Observe(float64(time.Since(start).Milliseconds()))
	if err != nil {
		fmt.Println("[wasm] run error:", err)
		runsTotal.WithLabelValues("error", moduleName).Inc()
		return
	}
	runsTotal.WithLabelValues("ok", moduleName).Inc()
}

func fetchModule(cfg Config, env *Envelope) (string, error) {
	filename := env.SHA256
	if filename == "" { filename = strings.ReplaceAll(env.Module, "/", "_") }
	cached := filepath.Join(cfg.CacheDir, filename + ".wasm")
	if st, err := os.Stat(cached); err == nil && st.Size() > 0 {
		cacheHitTotal.Inc(); return cached, nil
	}
	var src string
	if env.URL != "" {
		src = env.URL
	} else if env.CID != "" {
		cid := strings.TrimPrefix(env.CID, "ipfs://")
		src = cfg.IPFSGateway + "/ipfs/" + cid
	} else {
		return "", errors.New("no url/cid provided")
	}
	downloadsTotal.Inc()
	t0 := time.Now()
	resp, err := http.Get(src)
	if err != nil { return "", err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return "", fmt.Errorf("download status %d", resp.StatusCode) }
	data, err := io.ReadAll(resp.Body); if err != nil { return "", err }
	downloadMs.Observe(float64(time.Since(t0).Milliseconds()))
	if env.SHA256 != "" {
		sum := sha256.Sum256(data)
		if strings.ToLower(env.SHA256) != hex.EncodeToString(sum[:]) { return "", errors.New("sha256 mismatch") }
	}
	if err := os.WriteFile(cached, data, 0o644); err != nil { return "", err }
	return cached, nil
}

// --- KV simple file store ---
var kvMu sync.Mutex
var kvPath = "/tmp/void/kv.json"
func kvLoad() map[string]any {
	kvMu.Lock(); defer kvMu.Unlock()
	m := map[string]any{}
	b, err := os.ReadFile(kvPath)
	if err == nil { _ = json.Unmarshal(b, &m) }
	return m
}
func kvSave(m map[string]any) error {
	kvMu.Lock(); defer kvMu.Unlock()
	b, _ := json.Marshal(m)
	return os.WriteFile(kvPath, b, 0o600)
}

// --- HTTP allowlist ---
func hostAllowed(u *url.URL, hosts []string) bool {
	h := u.Hostname()
	for _, a := range hosts {
		a = strings.TrimSpace(a)
		if a == "" { continue }
		if a == h { return true }
		if a == "localhost" && (h == "localhost" || h == "127.0.0.1") { return true }
		if a == "relay" && (h == "relay" || strings.HasSuffix(h, "relay")) { return true }
	}
	return false
}

// --- Run WASM and handle syscalls ---
func runWasm(ctx context.Context, cfg Config, path string, env *Envelope) error {
	r := wazero.NewRuntime(ctx)
	defer r.Close(ctx)

	// WASI
	if _, err := wasi_snapshot_preview1.Instantiate(ctx, r); err != nil { return err }

	// FS: ephemeral temp dir
	tmpDir := filepath.Join(os.TempDir(), "void", "exec", fmt.Sprintf("%d", time.Now().UnixNano()))
	if err := os.MkdirAll(tmpDir, 0o755); err != nil { return err }
	defer os.RemoveAll(tmpDir)

	// Inputs on stdin
	inputs := env.Inputs; if inputs == nil { inputs = map[string]any{} }
	inBytes, _ := json.Marshal(inputs)
	stdin := bytes.NewReader(inBytes)

	var stdoutBuf bytes.Buffer
	var stderrBuf bytes.Buffer

	cfgMod := wazero.NewModuleConfig().
		WithStdout(&stdoutBuf).
		WithStderr(&stderrBuf).
		WithStdin(stdin).
		WithFSConfig(wazero.NewFSConfig().WithDir("/tmp", tmpDir))

	compiled, err := r.CompileModule(ctx, mustRead(path))
	if err != nil { return err }
	_, err = r.InstantiateModule(ctx, compiled, cfgMod)
	if err != nil { return err }

	// Process stdout lines
	sc := bufio.NewScanner(&stdoutBuf)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" { continue }
		var ev map[string]any
		if err := json.Unmarshal([]byte(line), &ev); err != nil {
			continue
		}
		stdoutEvents.Inc()
		if t, _ := ev["type"].(string); strings.HasPrefix(t, "syscall.") {
			handleSyscall(cfg, t, ev)
		} else {
			postEvent(cfg, ev)
		}
	}
	return sc.Err()
}

var httpClient = &http.Client{ Timeout: 2 * time.Second, Transport: &http.Transport{
	DialContext: (&net.Dialer{ Timeout: 1 * time.Second }).DialContext,
	DisableKeepAlives: true,
}}

func handleSyscall(cfg Config, kind string, payload map[string]any) {
	t0 := time.Now()
	result := "ok"
	defer func(){ sysReqTotal.WithLabelValues(kind, result).Inc(); sysDur.WithLabelValues(kind).Observe(float64(time.Since(t0).Milliseconds())) }()

	switch kind {
	case "syscall.emit":
		// forward event
		if ev, ok := payload["event"].(map[string]any); ok {
			postEvent(cfg, ev); return
		}
		result = "bad_event"
	case "syscall.kv.set":
		if !allowed("kv", cfg.AllowCaps) { result = "denied"; return }
		m := kvLoad()
		key, _ := payload["key"].(string)
		val := payload["value"]
		if key == "" { result = "bad_key"; return }
		m[key] = val
		if err := kvSave(m); err != nil { result = "io_err"; return }
		postEvent(cfg, map[string]any{"type":"sysret.kv.set","ok":true,"key":key})
	case "syscall.kv.get":
		if !allowed("kv", cfg.AllowCaps) { result = "denied"; return }
		m := kvLoad()
		key, _ := payload["key"].(string)
		val := m[key]
		postEvent(cfg, map[string]any{"type":"sysret.kv.get","ok": val != nil, "key": key, "value": val})
	case "syscall.http.fetch":
		if !allowed("http", cfg.AllowCaps) { result = "denied"; return }
		reqMap, _ := payload["req"].(map[string]any)
		id, _ := payload["id"].(string)
		method, _ := reqMap["method"].(string); if method == "" { method = "GET" }
		rawURL, _ := reqMap["url"].(string)
		if rawURL == "" { result = "bad_url"; return }
		u, err := url.Parse(rawURL); if err != nil { result = "bad_url"; return }
		if !hostAllowed(u, cfg.AllowHTTPHosts) { result = "host_denied"; return }
		bodyStr, _ := reqMap["body"].(string)
		hm := http.Header{}
		if h, ok := reqMap["headers"].(map[string]any); ok {
			for k,v := range h {
				if vs,ok := v.(string); ok { hm.Set(k, vs) }
			}
		}
		req, _ := http.NewRequest(method, rawURL, strings.NewReader(bodyStr))
		req.Header = hm
		resp, err := httpClient.Do(req)
		if err != nil { result = "io_err"; return }
		defer resp.Body.Close()
		// limited body read
		limKB := cfg.MaxHTTPKB
		if lims, ok := payload["limits"].(map[string]any); ok {
			if v, ok := lims["max_kb"].(float64); ok && int(v)>0 { limKB = int(v) }
		}
		limited := io.LimitedReader{ R: resp.Body, N: int64(limKB)*1024 }
		n, _ := io.Copy(io.Discard, &limited)
		postEvent(cfg, map[string]any{
			"type":"sysret.http","id":id,"status":resp.StatusCode,
			"kb": n/1024, "headers": map[string]any{"content-type": resp.Header.Get("content-type")},
		})
	default:
		result = "unknown"
	}
}

func mustRead(path string) []byte { b, err := os.ReadFile(path); if err != nil { panic(err) }; return b }

func postEvent(cfg Config, ev map[string]any) {
	url := cfg.RelayBase + cfg.EventPost
	body, _ := json.Marshal(ev)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("content-type", "application/json")
	http.DefaultClient.Do(req)
}
