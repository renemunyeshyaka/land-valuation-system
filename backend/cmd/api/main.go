package main

import (
	_ "backend/docs"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/api/routes"
	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/internal/workers"
	"backend/pkg/cache"
	"backend/pkg/logger"
	"backend/pkg/metrics"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Land Valuation System API
// @version 1.0
// @description Rwanda Land Valuation System with Official Gazette Integration
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.landvaluationsystem.rw/support
// @contact.email support@landvaluationsystem.rw

// @license.name Proprietary
// @license.url http://www.landvaluationsystem.rw/license

// @host api.landvaluationsystem.rw
// @BasePath /api/v1
// @schemes https http

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize logger
	log := logger.NewLogger()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Initialize database
	db, err := database.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.AutoMigrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Run SQL migrations (seed data, schema updates, etc.)
	if err := database.RunSQLMigrations(db); err != nil {
		log.Fatal("Failed to run SQL migrations:", err)
	}

	// Initialize Redis cache
	redisCache, err := cache.NewRedisCache(cfg)
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(log))
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimiter(redisCache))

	// Setup routes
	routes.Setup(router, db, redisCache)
	router.GET("/api/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Create server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Start payment status polling worker (background)
	ctx, cancelWorker := context.WithCancel(context.Background())
	defer cancelWorker()
	paymentService := services.NewPaymentService(db)
	txnRepo := repository.NewTransactionRepository(db)
	userService := services.NewUserService(db)
	invoiceService := services.NewInvoiceService()
	emailService := services.NewEmailService()
	go workers.StartPaymentStatusWorker(ctx, 30*time.Second, paymentService, txnRepo, userService, invoiceService, emailService)

	// Start subscription billing worker (background)
	subBillingWorker := workers.NewSubscriptionBillingWorker(db, paymentService)
	subBillingWorker.Start(ctx, 24*time.Hour) // Run daily

	// Register Prometheus metrics
	metrics.Register()

	// Expose /metrics endpoint
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())
		log.Println("Prometheus metrics endpoint running on :2112/metrics")
		http.ListenAndServe(":2112", mux)
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
