// Command repairpasswords repairs users whose password_hash is missing/empty.
//
// Background: cmd/seeder used to create users setting only the `password`
// column and never `password_hash`. Login() verifies against `password_hash`,
// so those users were permanently locked out with HTTP 401. This tool connects
// to the database using the SAME config/env as the backend (backend/.env) and
// sets a fresh bcrypt hash (a documented temp password) for every affected user.
//
// Usage (run from the backend directory, where .env lives):
//
//	REPAIR_TEMP_PASSWORD='Temp@123456' go run ./cmd/repairpasswords
//
// After running, affected users can log in with the temp password and change it
// in Settings (or via Forgot Password).
package main

import (
	"fmt"
	"log"
	"os"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	tempPassword := os.Getenv("REPAIR_TEMP_PASSWORD")
	if tempPassword == "" {
		tempPassword = "Temp@123456"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash temp password: %v", err)
	}
	hashStr := string(hash)

	// Only touch rows where password_hash is missing (excludes soft-deleted).
	var users []models.User
	if err := db.Where("password_hash IS NULL OR password_hash = ''").Find(&users).Error; err != nil {
		log.Fatalf("failed to query users: %v", err)
	}

	if len(users) == 0 {
		fmt.Println("✅ No users with missing password_hash. Nothing to repair.")
		return
	}

	fmt.Printf("🔧 Repairing %d user(s) with missing password_hash...\n", len(users))
	repaired := 0
	for _, u := range users {
		res := db.Model(&models.User{}).Where("id = ?", u.ID).Updates(map[string]interface{}{
			"password_hash": hashStr,
			"password":      hashStr,
		})
		if res.Error != nil {
			log.Printf("⚠️  failed to repair %s (id=%d): %v", u.Email, u.ID, res.Error)
			continue
		}
		repaired++
		fmt.Printf("   ✔ %s\n", u.Email)
	}

	fmt.Printf("\n✅ Done. Repaired %d/%d user(s).\n", repaired, len(users))
	fmt.Printf("   Temp password: %s\n", tempPassword)
	fmt.Println("   Users should log in with it and change it in Settings (or use Forgot Password).")
}
