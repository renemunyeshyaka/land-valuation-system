// Command repairpasswords diagnoses and repairs user password hashes.
//
// Background: Login() verifies against the `password_hash` column. If a user's
// stored hash does not match the password they type, login returns HTTP 401
// "invalid credentials". This tool connects using the SAME config/env as the
// backend (backend/.env) and lets you:
//
//  1. Diagnose: prints every user's email, hash prefix, hash length,
//     email_verified, is_active, and user_type so you can see what is stored.
//  2. Repair empty hashes (default): sets a fresh bcrypt hash for users whose
//     password_hash is missing/empty (created by the old seeder).
//  3. Force reset (REPAIR_FORCE=1): sets a fresh bcrypt hash for EVERY user,
//     guaranteeing login works with a known temp password regardless of the
//     current stored hash. Users then log in with the temp password and change
//     it in Settings (or via Forgot Password).
//
// Usage (run from the backend directory, where .env lives):
//
//	# diagnose only
//	go run ./cmd/repairpasswords
//
//	# repair users with missing hashes
//	REPAIR_TEMP_PASSWORD='Temp@123456' go run ./cmd/repairpasswords
//
//	# force-reset ALL users to the temp password
//	REPAIR_FORCE=1 REPAIR_TEMP_PASSWORD='Temp@123456' go run ./cmd/repairpasswords
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

	fmt.Printf("🔌 Connecting to DB at %s:%s/%s ...\n", cfg.DBHost, cfg.DBPort, cfg.DBName)
	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	fmt.Println("✅ Database connection established successfully")
	fmt.Println()

	tempPassword := os.Getenv("REPAIR_TEMP_PASSWORD")
	if tempPassword == "" {
		tempPassword = "Temp@123456"
	}
	force := os.Getenv("REPAIR_FORCE") == "1"

	// ---- Diagnose: show what is currently stored ----
	var users []models.User
	if err := db.Order("id").Find(&users).Error; err != nil {
		log.Fatalf("failed to query users: %v", err)
	}
	fmt.Printf("📋 Found %d user(s):\n", len(users))
	for _, u := range users {
		hash := u.PasswordHash
		prefix := "(empty)"
		if hash != "" {
			if len(hash) >= 7 {
				prefix = hash[:7]
			} else {
				prefix = hash
			}
		}
		fmt.Printf("   id=%-4d %-40s hash=%-10s len=%-4d verified=%-5v active=%-5v type=%s\n",
			u.ID, u.Email, prefix, len(hash), u.EmailVerified, u.IsActive, u.UserType)
	}
	fmt.Println()

	// ---- Repair ----
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash temp password: %v", err)
	}
	hashStr := string(hash)

	// Determine affected users
	var affected []models.User
	if force {
		affected = users
		fmt.Printf("🔧 REPAIR_FORCE=1: resetting ALL %d user(s) to temp password...\n", len(users))
	} else {
		for _, u := range users {
			if u.PasswordHash == "" {
				affected = append(affected, u)
			}
		}
		if len(affected) == 0 {
			fmt.Println("✅ No users with missing password_hash. Nothing to repair.")
			fmt.Println("   Tip: run with REPAIR_FORCE=1 to reset ALL users to the temp password.")
			return
		}
		fmt.Printf("🔧 Repairing %d user(s) with missing password_hash...\n", len(affected))
	}

	repaired := 0
	for _, u := range affected {
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

	fmt.Printf("\n✅ Done. Repaired %d/%d user(s).\n", repaired, len(affected))
	fmt.Printf("   Temp password: %s\n", tempPassword)
	fmt.Println("   Users should log in with it and change it in Settings (or use Forgot Password).")
}
