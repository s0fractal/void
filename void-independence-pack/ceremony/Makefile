.PHONY: act tag release
ACT := ACT_OF_INDEPENDENCE_$(shell date +%Y-%m-%d)_1632_UA.md
RULES ?= rules/rules.yaml
POLICY ?= router/policy.yaml
COMPOSE ?= docker-compose.yml
REPORT ?= report.json

act:
	@node scripts/ceremony-act.mjs $(REPORT) --rules $(RULES) --policy $(POLICY) --compose $(COMPOSE) --out $(ACT)

tag:
	@git add $(ACT) && git commit -m "feat: Independence Act" || true
	@git tag -a "independence-$(shell date +%Y%m%d)-1632" -m "Void MN-1 — $(shell date -Iseconds)"
	@echo "✔ Tagged"

release:
	@echo "(optional) gh release create $$(git describe --tags --abbrev=0) $(ACT)"
