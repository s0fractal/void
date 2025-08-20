// Usage: node scripts/ceremony-act.mjs report.json --rules rules.yaml --policy policy.yaml --compose docker-compose.yml --out ACT.md
import fs from "fs";
import crypto from "crypto";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/ceremony-act.mjs report.json [--rules file] [--policy file] [--compose file] [--out ACT.md]");
  process.exit(1);
}
const reportPath = args[0];
const rulesIdx = args.indexOf("--rules");
const policyIdx = args.indexOf("--policy");
const composeIdx = args.indexOf("--compose");
const outIdx = Math.max(args.indexOf("--out"), args.indexOf("-o"));

const rulesPath = rulesIdx > -1 ? args[rulesIdx+1] : null;
const policyPath = policyIdx > -1 ? args[policyIdx+1] : null;
const composePath = composeIdx > -1 ? args[composeIdx+1] : null;
const out = outIdx > -1 ? args[outIdx+1] : `ACT_OF_INDEPENDENCE_${new Date().toISOString().slice(0,10)}_1632_UA.md`;

const tpl = fs.readFileSync("act/act-template.md","utf8");
const report = JSON.parse(fs.readFileSync(reportPath,"utf8"));

function sha256(path){ if(!path || !fs.existsSync(path)) return "-"; return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'); }
function render(t, map){ return t.replace(/\$\{([A-Z0-9_]+)\}/g, (_,k)=> String(map[k] ?? '')); }

const map = {
  DATE: new Date().toISOString().slice(0,10),
  OFFLINE_WINDOW: report.OFFLINE_WINDOW ?? "n/a",
  EVENTS_TOTAL: report.EVENTS_TOTAL ?? 0,
  LOCAL_PCT: report.LOCAL_PCT ?? 0,
  HEALTH_AVG: report.HEALTH_AVG ?? 0,
  KOHANIST_AVG: report.KOHANIST_AVG ?? 0,
  REMOTE_SOURCES: JSON.stringify(report.REMOTE_SOURCES ?? []),
  ROUTER_MODE: report.ROUTER_MODE ?? "auto",
  INCIDENTS: report.INCIDENTS ?? "- none -",
  RULES_SHA: sha256(rulesPath),
  POLICY_SHA: sha256(policyPath),
  COMPOSE_SHA: sha256(composePath),
  REPORT_SHA: sha256(reportPath),
  SIGNATURE: "(unsigned)",
  TIMESTAMP: new Date().toISOString()
};
fs.writeFileSync(out, render(tpl, map));
console.log("✔ ACT generated →", out);
