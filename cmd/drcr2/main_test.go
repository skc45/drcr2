package main

import "testing"

func TestGenerateToken(t *testing.T) {
	tok, ok := generateToken("+")
	if !ok || tok.Type != "op" || tok.Value != "+" {
		t.Fatalf("got %+v ok=%v", tok, ok)
	}
	if _, ok := generateToken("plus"); ok {
		t.Fatal("words are not accepted")
	}
}

func TestGenerateTokens(t *testing.T) {
	all := generateTokens()
	if len(all) != 4 {
		t.Fatalf("len=%d", len(all))
	}
	if all["*"].Value != "*" {
		t.Fatalf("%+v", all["*"])
	}
}
