# Syscalls для WASM модулів

Модуль пише у stdout **рядки JSON** (NDJSON). Виконавець перехоплює спеціальні типи:

## 1) syscall.emit
```json
{"type":"syscall.emit","event":{"type":"annotation.note","meta":{"msg":"hi"}}}
```
→ постить `event` у Relay `/event`.

## 2) syscall.http.fetch
```json
{
  "type":"syscall.http.fetch",
  "id":"req-1",
  "req":{"method":"GET","url":"http://relay:8787/healthz","headers":{"accept":"application/json"},"body":""},
  "limits":{"max_kb":64,"timeout_ms":1500}
}
```
→ якщо дозволено політикою `caps:http` і хост присутній у ALLOW_HTTP_HOSTS, виконавець зробить запит і згенерує:
```json
{"type":"sysret.http","id":"req-1","status":200,"kb":1,"headers":{"content-type":"application/json"}}
```
> Тіло не ретранслюється (або обрізається до `max_kb` і хешується — під капотом).

## 3) syscall.kv.get / syscall.kv.set
```json
{"type":"syscall.kv.set","key":"note/last","value":{"msg":"hello"}}
{"type":"syscall.kv.get","key":"note/last"}
```
→ відповіді:
```json
{"type":"sysret.kv.set","ok":true}
{"type":"sysret.kv.get","ok":true,"value":{"msg":"hello"}}
```
KV — локальний файлик у `/tmp/void/kv.json` з блокуванням. Дозволено тільки при `caps:kv`.
