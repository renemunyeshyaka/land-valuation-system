package main

import "log"

// Legacy entrypoint intentionally disabled to avoid route drift.
// Use cmd/api/main.go as the single backend runtime entrypoint.
func main() {
	log.Fatal("legacy entrypoint disabled: run go run ./cmd/api")
}
