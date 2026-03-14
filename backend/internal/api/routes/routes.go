package routes

import (
	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
	"backend/internal/repository"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
)

// Setup is an alias for RegisterRoutes for compatibility
func Setup(router *gin.Engine, db interface{}, redisClient *redis.Client) {
	// Type assert db to *gorm.DB if possible
	var gormDB *gorm.DB
	if db != nil {
		gormDB, _ = db.(*gorm.DB)
	}
	RegisterRoutes(router, gormDB, redisClient)
}

// RegisterRoutes registers all API routes
func RegisterRoutes(router *gin.Engine, db *gorm.DB, redisClient *redis.Client) {
	// Initialize services and handlers
	setupAuthRoutes(router, db)
	setupUserRoutes(router, db)
	setupPropertyRoutes(router, db)
	setupValuationRoutes(router, db)
	setupSubscriptionRoutes(router, db)
	setupPaymentRoutes(router, db, redisClient)
	setupAnalyticsRoutes(router, db)
	setupAdminRoutes(router, db)
	setupNotificationRoutes(router, db)
	setupExchangeRateRoutes(router, redisClient)
	setupReferralRoutes(router, db)
	setupHealthRoutes(router, db)

	// Invoice/Receipt download endpoint
	invoiceService := services.NewInvoiceService()
	userService := services.NewUserService(db)
	txnRepo := repository.NewTransactionRepository(db)
	txnService := services.NewTransactionService(txnRepo)
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService, userService, txnService)
	invoice := router.Group("/api/invoice")
	invoice.Use(middleware.AuthRequired())
	{
		invoice.GET(":txn_id/download", invoiceHandler.DownloadInvoice)
	}
}

func setupAuthRoutes(router *gin.Engine, db *gorm.DB) {
	authService := services.NewAuthService(db)
	authHandler := handlers.NewAuthHandler(authService)

	auth := router.Group("/api/v1/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", middleware.AuthRequired(), authHandler.Logout)
		auth.POST("/refresh", authHandler.RefreshToken)

		// Email verification endpoints
		auth.POST("/verify-email", authHandler.VerifyEmail)
		auth.POST("/resend-activation", authHandler.ResendActivationCode)

		// OTP verification endpoints
		auth.POST("/verify-otp", authHandler.VerifyOTP)
		auth.POST("/resend-otp", authHandler.ResendOTP)

		// Password reset endpoints
		auth.POST("/forgot-password", authHandler.RequestPasswordReset)
		auth.POST("/reset-password", authHandler.ResetPassword)

		// 2FA endpoints (for TOTP authenticator apps)
		auth.POST("/2fa/enable", middleware.AuthRequired(), authHandler.Enable2FA)
		auth.POST("/2fa/verify", middleware.AuthRequired(), authHandler.Verify2FA)
	}
}

func setupUserRoutes(router *gin.Engine, db *gorm.DB) {
	userService := services.NewUserService(db)
	userHandler := handlers.NewUserHandler(userService)

	users := router.Group("/api/v1/users")
	users.Use(middleware.AuthRequired())
	{
		users.GET("/profile", userHandler.GetProfile)
		users.PUT("/profile", userHandler.UpdateProfile)

		// Aliases for /me endpoints (same as /profile)
		users.GET("/me", userHandler.GetProfile)
		users.PUT("/me", userHandler.UpdateProfile)

		users.POST("/kyc", userHandler.SubmitKYC)
		users.GET("/kyc/status", userHandler.GetKYCStatus)
		users.POST("/change-password", userHandler.ChangePassword)
		users.GET("/account-settings", userHandler.GetAccountSettings)
		users.PUT("/account-settings", userHandler.UpdateAccountSettings)
		users.DELETE("/account", userHandler.DeleteAccount)
		users.GET("/activity", userHandler.GetActivity)
	}
}

func setupPropertyRoutes(router *gin.Engine, db *gorm.DB) {
	// Initialize repositories and services
	propertyRepo := repository.NewPropertyRepository(db)
	propertyHandler := handlers.NewPropertyHandler(propertyRepo)
	marketplaceHandler := handlers.NewMarketplaceHandler(services.NewMarketplaceService(db))

	properties := router.Group("/api/v1/properties")
	{
		properties.GET("", propertyHandler.ListProperties)
		properties.GET("/:id", propertyHandler.GetProperty)
		properties.POST("/search", propertyHandler.SearchNearby)
		properties.GET("/stats", propertyHandler.GetStatistics)

		protectedProperties := properties.Group("")
		protectedProperties.Use(middleware.AuthRequired())
		{
			protectedProperties.POST("", propertyHandler.CreateProperty)
			protectedProperties.PUT("/:id", propertyHandler.UpdateProperty)
			protectedProperties.DELETE("/:id", propertyHandler.DeleteProperty)
			protectedProperties.GET("/:id/marketplace-listings", marketplaceHandler.GetMarketplaceListings)
			protectedProperties.POST("/:id/sync-marketplace", marketplaceHandler.SyncMarketplaceAPIs)
		}
	}

	marketplace := router.Group("/api/v1/marketplace")
	{
		marketplace.GET("/properties-for-sale", marketplaceHandler.GetPropertyListingsOnSale)
	}
}

func setupValuationRoutes(router *gin.Engine, db *gorm.DB) {
	// Initialize repositories and services
	propertyRepo := repository.NewPropertyRepository(db)
	landParcelRepo := repository.NewLandParcelRepository(db)
	valuationRepo := repository.NewValuationRepository(db)
	gazetteService := &services.GazetteService{}
	valuationService := services.NewValuationService(propertyRepo, landParcelRepo, valuationRepo, gazetteService)
	valuationHandler := handlers.NewValuationHandler(valuationService)

	// Register refined Estimate Search endpoint
	router.POST("/api/v1/estimate-search", handlers.EstimateSearchHandler(valuationService))

	valuations := router.Group("/api/v1/valuations")
	{
		// Public endpoint - anyone can request a valuation estimate
		valuations.POST("", valuationHandler.CreateValuation)
		// UPI-based automatic valuation
		valuations.GET("/by-upi/:upi", valuationHandler.GetValuationByUPI)
		valuations.GET("/:id", valuationHandler.GetValuationByID)

		// Protected routes - user's own valuations
		protected := valuations.Group("")
		protected.Use(middleware.AuthRequired())
		{
			protected.GET("", valuationHandler.ListValuations)
			protected.GET("/history", valuationHandler.GetValuationHistory)
		}
	}

	// Admin routes for valuation approval workflow
	adminValuations := router.Group("/api/v1/admin/valuations")
	adminValuations.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		adminValuations.POST("/:id/approve", valuationHandler.ApproveValuation)
		adminValuations.POST("/:id/reject", valuationHandler.RejectValuation)
	}
}

func setupSubscriptionRoutes(router *gin.Engine, db *gorm.DB) {
	subscriptionService := services.NewSubscriptionService(db)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)

	subscriptions := router.Group("/api/v1/subscriptions")
	{
		subscriptions.GET("/plans", subscriptionHandler.GetPlans)

		protectedSub := subscriptions.Group("")
		protectedSub.Use(middleware.AuthRequired())
		{
			protectedSub.GET("/current", subscriptionHandler.GetCurrentSubscription)
			protectedSub.POST("/upgrade", subscriptionHandler.UpgradeSubscription)
			protectedSub.POST("/downgrade", subscriptionHandler.DowngradeSubscription)
			protectedSub.POST("/cancel", subscriptionHandler.CancelSubscription)
			protectedSub.GET("/billing-history", subscriptionHandler.GetBillingHistory)
			protectedSub.PUT("/billing-info", subscriptionHandler.UpdateBillingInfo)
			protectedSub.GET("/invoices/:id", subscriptionHandler.GetInvoice)
		}
	}
}

func setupPaymentRoutes(router *gin.Engine, db *gorm.DB, redisClient *redis.Client) {
	// Initialize all payment services
	mobilePaymentService := services.NewPaymentService(db)
	bankPaymentService := services.NewBankPaymentService(db)
	blockchainPaymentService := services.NewBlockchainPaymentService(db, redisClient)

	// Initialize handlers
	paymentHandler := handlers.NewPaymentHandler(mobilePaymentService)
	multiPaymentHandler := handlers.NewMultiPaymentHandler(
		mobilePaymentService,
		bankPaymentService,
		blockchainPaymentService,
	)

	payments := router.Group("/api/v1/payments")
	{
		// Public endpoint - no auth
		payments.GET("/methods", multiPaymentHandler.GetAvailablePaymentMethods)

		// Protected routes
		protected := payments.Group("")
		protected.Use(middleware.AuthRequired())
		{
			// Mobile Money (active)
			protected.POST("/mobile-money", paymentHandler.InitiateMobileMoneyPayment)
			protected.GET("/:transaction_id/status", paymentHandler.CheckPaymentStatus)
		}
	}

	// Webhook routes (no auth required)
	webhooks := router.Group("/api/v1/payments/webhook")
	{
		webhooks.POST("", paymentHandler.HandlePaymentCallback)
	}
}

func setupAnalyticsRoutes(router *gin.Engine, db *gorm.DB) {
	analyticsService := services.NewAnalyticsService(db)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	analytics := router.Group("/api/v1/analytics")
	analytics.Use(middleware.AuthRequired())
	{
		analytics.GET("/dashboard", analyticsHandler.GetDashboard)
		analytics.GET("/properties/:id", analyticsHandler.GetPropertyAnalytics)
		analytics.GET("/market-trends", analyticsHandler.GetMarketTrends)
		analytics.GET("/heatmap", analyticsHandler.GetHeatmap)
		analytics.GET("/activity-report", analyticsHandler.GetUserActivityReport)
		analytics.GET("/searches", analyticsHandler.GetSearchAnalytics)
		analytics.GET("/valuation-insights", analyticsHandler.GetValuationInsights)
		analytics.POST("/export", analyticsHandler.ExportAnalyticsReport)
	}

	// Revenue analytics (admin only)
	adminAnalytics := router.Group("/api/v1/admin/analytics")
	adminAnalytics.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		adminAnalytics.GET("/revenue", analyticsHandler.GetRevenueAnalytics)
	}
}

func setupAdminRoutes(router *gin.Engine, db *gorm.DB) {
	adminService := services.NewAdminService(db)
	adminHandler := handlers.NewAdminHandler(adminService)

	admin := router.Group("/api/v1/admin")
	admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		admin.GET("/users", adminHandler.GetAllUsers)
		admin.GET("/users/:id", adminHandler.GetUser)
		admin.POST("/users/:id/verify-kyc", adminHandler.VerifyUserKYC)
		admin.POST("/users/:id/suspend", adminHandler.SuspendUser)
		admin.POST("/users/:id/reactivate", adminHandler.ReactivateUser)
		admin.POST("/content/:id/moderate", adminHandler.ModerateContent)
		admin.GET("/config", adminHandler.GetSystemConfig)
		admin.PUT("/config", adminHandler.UpdateSystemConfig)
		admin.GET("/audit-logs", adminHandler.GetAuditLogs)
		admin.GET("/health", adminHandler.GetSystemHealth)
		admin.GET("/subscriptions", adminHandler.ManageSubscriptions)
		admin.POST("/properties/:id/approve", adminHandler.ApproveProperty)
		admin.POST("/properties/:id/reject", adminHandler.RejectProperty)
	}
}

func setupNotificationRoutes(router *gin.Engine, db *gorm.DB) {
	notificationService := services.NewNotificationService(db)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	admin := router.Group("/api/v1/admin")
	admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		admin.POST("/notifications", notificationHandler.SendToUser)
		admin.POST("/notifications/broadcast", notificationHandler.BroadcastNotification)
	}

	users := router.Group("/api/v1/users")
	users.Use(middleware.AuthRequired())
	{
		users.GET("/notifications", notificationHandler.ListUserNotifications)
		users.POST("/notifications/:id/read", notificationHandler.MarkNotificationRead)
		users.POST("/notifications/read-all", notificationHandler.MarkAllAsRead)
		users.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
		users.DELETE("/notifications/:id", notificationHandler.DeleteNotification)
	}
}

func setupExchangeRateRoutes(router *gin.Engine, redisClient *redis.Client) {
	exchangeRateHandler := handlers.NewExchangeRateHandler(redisClient)

	exchangeRate := router.Group("/api/v1/exchange-rate")
	{
		// Public endpoints - anyone can check rates
		exchangeRate.GET("", exchangeRateHandler.GetCurrentRate)
		exchangeRate.GET("/convert", exchangeRateHandler.ConvertCurrency)

		// Admin only - refresh cache
		admin := exchangeRate.Group("")
		admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
		{
			admin.POST("/refresh", exchangeRateHandler.RefreshRate)
		}
	}
}

func setupReferralRoutes(router *gin.Engine, db *gorm.DB) {
	referralService := services.NewReferralService(db)
	referralHandler := handlers.NewReferralHandler(referralService)

	referrals := router.Group("/api/v1/referral")
	{
		// Public endpoints - anyone can validate a referral code
		referrals.GET("/:code", referralHandler.ValidateReferralCode)
		referrals.GET("/stats/public", referralHandler.GetReferralStats)

		// Protected endpoints - authenticated users only
		protected := referrals.Group("")
		protected.Use(middleware.AuthRequired())
		{
			protected.GET("/me/info", referralHandler.GetMyReferralInfo)
			protected.POST("/generate", referralHandler.GenerateReferralCode)
		}
	}
}

func setupHealthRoutes(router *gin.Engine, db *gorm.DB) {
	healthHandler := handlers.NewHealthHandler(db)

	// Root level health endpoints (no /api/v1 prefix for monitoring)
	router.GET("/health", healthHandler.HealthCheck)
	router.GET("/ready", healthHandler.ReadinessCheck)
	router.GET("/live", healthHandler.LivenessCheck)

	// API versioned health endpoints
	health := router.Group("/api/v1/health")
	{
		health.GET("", healthHandler.HealthCheck)
		health.GET("/db", healthHandler.DatabaseStats)
	}
}
