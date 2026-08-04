package models

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

// Regression test for the seeder bug: Login() verifies against PasswordHash,
// so any user created with only Password set must still end up with a usable
// PasswordHash. See commit b5e580f.
func TestBeforeCreatePopulatesPasswordHash(t *testing.T) {
	u := &User{Email: "test@example.com", Password: "secret123"}
	if err := u.BeforeCreate(nil); err != nil {
		t.Fatal(err)
	}
	if u.PasswordHash == "" {
		t.Fatal("PasswordHash was not populated")
	}
	if u.PasswordHash != u.Password {
		t.Fatal("PasswordHash should mirror Password")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("secret123")); err != nil {
		t.Fatalf("password no longer matches hash: %v", err)
	}
}

// Ensure an already-bcrypted password is never re-hashed (double hash).
func TestBeforeCreateDoesNotDoubleHash(t *testing.T) {
	h, _ := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	u := &User{Email: "test@example.com", Password: string(h)}
	if err := u.BeforeCreate(nil); err != nil {
		t.Fatal(err)
	}
	if u.Password != string(h) {
		t.Fatal("already-bcrypted password was re-hashed (double hash)")
	}
	if u.PasswordHash != string(h) {
		t.Fatal("PasswordHash should equal the original hash")
	}
}
