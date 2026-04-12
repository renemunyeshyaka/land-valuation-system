-- Migration: Add likes_count to properties table
-- Filename: 20260412_add_likes_count_to_properties.sql

ALTER TABLE properties ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;