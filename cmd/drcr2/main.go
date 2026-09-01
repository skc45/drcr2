package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Token struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

var ops = []string{"+", "-", "*", "/"}

func generateToken(value string) (Token, bool) {
	for _, op := range ops {
		if value == op {
			return Token{Type: "op", Value: op}, true
		}
	}
	return Token{}, false
}

func generateTokens() map[string]Token {
	out := make(map[string]Token, len(ops))
	for _, op := range ops {
		tok, _ := generateToken(op)
		out[op] = tok
	}
	return out
}

func writeJSON(v any) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

func usage() {
	fmt.Fprint(os.Stderr, `Generate an op token as JSON.

Usage:
  drcr2           emit all tokens
  drcr2 +         emit {"type":"op","value":"+"}
  drcr2 -         emit minus
  drcr2 *         emit times
  drcr2 /         emit divide

Exit 0 on success, 2 if the argument is not an op.
`)
}

func main() {
	args := os.Args[1:]
	if len(args) == 1 && (args[0] == "-h" || args[0] == "--help") {
		usage()
		os.Exit(0)
	}
	if len(args) == 0 {
		if err := writeJSON(generateTokens()); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if len(args) != 1 {
		usage()
		os.Exit(2)
	}
	tok, ok := generateToken(args[0])
	if !ok {
		fmt.Fprintf(os.Stderr, "not an op: %q (use + - * /)\n", args[0])
		os.Exit(2)
	}
	if err := writeJSON(tok); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
