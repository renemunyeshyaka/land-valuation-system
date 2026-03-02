package cache

import "backend/internal/config"

// NewRedisCache returns a dummy cache (stub)
func NewRedisCache(cfg *config.Config) (interface{}, error) {
	return nil, nil
}
