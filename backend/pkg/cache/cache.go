package cache

import (
	"backend/internal/config"
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

// NewRedisCache creates a Redis client connection
func NewRedisCache(cfg *config.Config) (*redis.Client, error) {
	// Skip Redis if not configured (development mode)
	if cfg.RedisHost == "" {
		return nil, nil
	}

	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return client, nil
}
