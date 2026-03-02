package database

import "backend/internal/config"

// NewPostgresConnection returns a dummy DB connection (stub)
func NewPostgresConnection(cfg *config.Config) (interface{}, error) {
	return nil, nil
}
