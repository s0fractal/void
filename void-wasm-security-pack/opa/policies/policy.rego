package void.policy

default allow = false

# Дозволяємо тільки задекларовані префікси модулів
allow {
  startswith(input.module, "wasm/ci/")
}

allow {
  startswith(input.module, "wasm/pulse/")
}

# Капи повинні бути підмножиною дозволених
caps_ok {
  allowed := {"emit", "kv", "http"}
  every c in input.caps { c == "emit" }
}

# Ліміти в межах стелі
limits_ok {
  input.limits.timeout_ms <= 5000
  input.limits.mem_mb <= 256
}

# Підписант (опційно)
signer_ok {
  not input.signer
} else {
  endswith(input.signer, "@collective.org")
}

allow {
  caps_ok
  limits_ok
  signer_ok
}
