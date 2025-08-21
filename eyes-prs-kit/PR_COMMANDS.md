# Quick PR Commands

## 1. Create PRs
```bash
cd /Users/chaoshex/Projects/void-fnpm
bash eyes-prs-kit/scripts/create_eyes_prs.sh origin fnpm-integration
```

## 2. Add Review Checklists as Comments
```bash
# Replace PR_NUMBER_1 and PR_NUMBER_2 with actual PR numbers
gh pr comment PR_NUMBER_1 --body-file eyes-prs-kit/REVIEW_CHECKLIST_RELAY.md
gh pr comment PR_NUMBER_2 --body-file eyes-prs-kit/REVIEW_CHECKLIST_DASHBOARD.md
```

## 3. Add Labels
```bash
gh pr edit PR_NUMBER_1 --add-label "enhancement,integration,eyes-gemini,432Hz"
gh pr edit PR_NUMBER_2 --add-label "enhancement,integration,eyes-gemini,432Hz"
```

## 4. Conventional Commits (for squash)
```
feat(relay/eyes): add /eyes/url + Gemini analysis + WS/SSE broadcast
feat(dashboard): add EyesPanel with live SSE (veracity, complexity, affect)
docs(relay,dashboard): add Eyes README + integration guide
```

## 5. Quick Verification
```bash
# Test relay endpoint
./void-sensor-incubator/examples/eyes-url.sh https://github.com/voideditor/void

# Check SSE stream
curl -s http://localhost:8787/sse | grep '"type":"eyes"'

# Test allowlist (should get 403)
EYES_ALLOWLIST=github.com curl -X POST http://localhost:8787/eyes/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```