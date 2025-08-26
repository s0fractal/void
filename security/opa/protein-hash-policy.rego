package chimera.wasm.validation

# Режим за замовчуванням
default allow = false
default deny_reason = ""

# 1) Дозволяємо модулі з перевіреним protein-hash і високою схожістю
allow {
  input.protein_hash.verified == true
  input.protein_hash.similarity >= 0.95
  input.protein_hash.signature == data.trust.signatures[_]
}

# 2) Уайтліст CIDs (швидкі винятки)
allow {
  input.cid == data.trust.whitelist_cids[_]
}

# 3) Відхиляємо складні модулі з недостатніми лімітами (узгоджено з PR-E)
deny_reason := "complexity/gas" {
  input.protein_hash.complexity > 100
  input.policy.max_gas < 1000000
}

# 4) Резонанс @ 432Hz — обов'язковий
deny_reason := "resonance/432hz-required" {
  input.metadata.resonance_hz \!= 432
}

# Якщо є причина — deny
deny {
  deny_reason \!= ""
}
