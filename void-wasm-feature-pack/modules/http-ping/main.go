package main

import (
	"encoding/json"
	"fmt"
)

func main() {
	// попросимо виконавця зробити HTTP GET до relay health
	req := map[string]any{
		"type": "syscall.http.fetch",
		"id":   "ping-1",
		"req": map[string]any{
			"method":"GET",
			"url":"http://relay:8787/healthz",
			"headers": map[string]any{"accept":"application/json"},
		},
		"limits": map[string]any{ "max_kb": 8 },
	}
	b,_ := json.Marshal(req)
	fmt.Println(string(b))

	// і додатково видимо емісимо просту ноту
	ev := map[string]any{
		"type": "annotation.note",
		"meta": map[string]any{"msg":"http-ping requested"},
	}
	b2,_ := json.Marshal(ev)
	fmt.Println(string(b2))
}
