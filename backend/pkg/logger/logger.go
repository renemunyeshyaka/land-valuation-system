package logger

import "log"

// NewLogger returns a standard logger (stub)
func NewLogger() *log.Logger {
	return log.Default()
}
