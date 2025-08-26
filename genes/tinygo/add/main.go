package main

// Pure numeric function for WASM export
//export add
func add(a int32, b int32) int32 {
	return a + b
}

// Required for WASM build
func main() {}