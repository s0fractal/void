#!/bin/bash
# Ultra-reliable ceremony tools using only jq

# 1. Quick validation of report.json
validate_report() {
  jq -e '
    . as $r
    | def num: (type=="number") or (type=="string" and (tonumber? != null));
    (has("LOCAL_PCT") and has("HEALTH_AVG") and has("KOHANIST_AVG") and has("OFFLINE_WINDOW") and has("EVENTS_TOTAL"))
    and (.LOCAL_PCT|num) and (.HEALTH_AVG|num) and (.KOHANIST_AVG|num) and (.EVENTS_TOTAL|num)
  ' "$1" && echo "✅ schema ok" || echo "❌ missing/invalid fields"
}

# 2. Fill release with auto-normalization (0.87 → 87%)
fill_release_normalized() {
  local REPORT="${1:-report.json}"
  local TEMPLATE="${2:-ceremony/GITHUB_RELEASE_BODY.md}"
  local OUTPUT="${3:-ceremony/GITHUB_RELEASE_BODY_filled.md}"
  
  jq -r --slurpfile tpl "$TEMPLATE" '
    def percentize:
      if type=="number" then (if .<=1 then . * 100 else . end)
      elif type=="string" and (tonumber?!=null) then
        (tonumber | (if .<=1 then . * 100 else . end))
      else . end;
    def n(x): (x // "N/A");
    def pf(x): (x|percentize|floor|tostring) + "%";

    . as $r
    | $tpl[0]
    | gsub("\\{LOCAL_PCT\\}";      pf($r.LOCAL_PCT));
      gsub("\\{HEALTH_AVG\\}";     (n($r.HEALTH_AVG|tostring)));
      gsub("\\{KOHANIST_AVG\\}";   (n($r.KOHANIST_AVG|tostring)));
      gsub("\\{OFFLINE_WINDOW\\}"; (n($r.OFFLINE_WINDOW|tostring)));
      gsub("\\{EVENTS_TOTAL\\}";   (n($r.EVENTS_TOTAL|tostring)))
  ' "$REPORT" > "$OUTPUT"
  
  echo "✅ Filled: $OUTPUT (with % normalization)"
}

# Run if called directly
if [ "${1:-}" = "validate" ]; then
  validate_report "${2:-report.json}"
elif [ "${1:-}" = "fill" ]; then
  fill_release_normalized "${2:-report.json}" "${3:-ceremony/GITHUB_RELEASE_BODY.md}" "${4:-ceremony/GITHUB_RELEASE_BODY_filled.md}"
else
  echo "Usage:"
  echo "  $0 validate [report.json]"
  echo "  $0 fill [report.json] [template.md] [output.md]"
fi