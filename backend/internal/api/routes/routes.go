package routes

import (
	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
	"backend/internal/repository"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// Setup is an alias for RegisterRoutes for compatibility
func Setup(router *gin.Engine, db interface{}) {
	// Type assert db to *sqlx.DB if possible
	var sqlxDB *sqlx.DB
	if db != nil {
		sqlxDB, _ = db.(*sqlx.DB)
	}
	RegisterRoutes(router, sqlxDB)
}

// RegisterRoutes registers all API routes
func RegisterRoutes(router *gin.Engine, db *sqlx.DB) {
	// Initialize services and handlers
	setupAuthRoutes(router, db)
	setupUserRoutes(router, db)
	setupPropertyRoutes(router, db)
	setupSubscriptionRoutes(router, db)
	setupPaymentRoutes(router, db)
	setupAnalyticsRoutes(router, db)
	setupAdminRoutes(router, db)
	setupHealthRoutes(router)
}

func setupAuthRoutes(router *gin.Engine, db *sqlx.DB) {
	authService := services.NewAuthService(db)
	authHandler := handlers.NewAuthHandler(authService)

	auth := router.Group("/api/v1/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", middleware.AuthRequired(), authHandler.Logout)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/verify-email", authHandler.VerifyEmail)
		auth.POST("/forgot-password", authHandler.RequestPasswordReset)
		auth.POST("/reset-password", authHandler.ResetPassword)
		auth.POST("/2fa/enable", middleware.AuthRequired(), authHandler.Enable2FA)
		auth.POST("/2fa/verify", middleware.AuthRequired(), authHandler.Verify2FA)
	}
}

func setupUserRoutes(router *gin.Engine, db *sqlx.DB) {
	userService := services.NewUserService(db)
	userHandler := handlers.NewUserHandler(userService)

	users := router.Group("/api/v1/users")
	users.Use(middleware.AuthRequired())
	{
		users.GET("/profile", userHandler.GetProfile)
		users.PUT("/profile", userHandler.UpdateProfile)
		users.POST("/kyc", userHandler.SubmitKYC)
		users.GET("/kyc/status", userHandler.GetKYCStatus)
		users.POST("/change-password", userHandler.ChangePassword)
		users.GET("/account-settings", userHandler.GetAccountSettings)
		users.PUT("/account-settings", userHandler.UpdateAccountSettings)
		users.DELETE("/account", userHandler.DeleteAccount)
		users.GET("/activity", userHandler.GetActivity)
	}
}

func setupPropertyRoutes(router *gin.Engine, db *sqlx.DB) {
	// Initialize repositories and services
	propertyRepo := &repository.PropertyRepository{}
	valuationRepo := &repository.ValuationRepository{}
	gazetteService := &services.GazetteService{}
	valuationService := services.NewValuationService(propertyRepo, valuationRepo, gazetteService)
	marketplaceService := services.NewMarketplaceService(db)
	propertyHandler := handlers.NewPropertyHandler(valuationService, marketplaceService)

	properties := router.Group("/api/v1/properties")
	{
		properties.GET("", propertyHandler.ListProperties)
		properties.GET("/:id", propertyHandler.GetProperty)
		properties.POST("/search", propertyHandler.SearchProperties)

		protectedProperties := properties.Group("")
		protectedProperties.Use(middleware.AuthRequired())
		{
			protectedProperties.POST("", propertyHandler.CreateProperty)
			protectedProperties.PUT("/:id", propertyHandler.UpdateProperty)
			protectedProperties.DELETE("/:id", propertyHandler.DeleteProperty)
			protectedProperties.GET("/:id/marketplace-listings", propertyHandler.GetMarketplaceListings)
			protectedProperties.POST("/:id/sync-marketplace", propertyHandler.SyncMarketplaceAPIs)
		}
	}

	marketplace := router.Group("/api/v1/marketplace")
	{
		marketplace.GET("/properties-for-sale", propertyHandler.GetPropertyListingsOnSale)
	}
}

func setupSubscriptionRoutes(router *gin.Engine, db *sqlx.DB) {
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

func setupPaymentRoutes(router *gin.Engine, db *sqlx.DB) {
	paymentService := services.NewPaymentService(db)
	paymentHandler := handlers.NewPaymentHandler(paymentService)

	payments := router.Group("/api/v1/payments")
	payments.Use(middleware.AuthRequired())
	{
		payments.POST("/card", paymentHandler.InitiateCardPayment)
		payments.POST("/mobile-money", paymentHandler.InitiateMobileMoneyPayment)
		payments.POST("/bank-transfer", paymentHandler.InitiateBankTransfer)
		payments.GET("/methods", paymentHandler.GetPaymentMethods)
		payments.POST("/methods", paymentHandler.AddPaymentMethod)
		payments.DELETE("/methods/:id", paymentHandler.DeletePaymentMethod)
		payments.GET("/transactions", paymentHandler.GetTransactionHistory)
		payments.POST("/refund", paymentHandler.RequestRefund)
	}

	// Webhook routes (no auth required)
	webhooks := router.Group("/api/v1/payments/webhook")
	{
		webhooks.POST("", paymentHandler.HandleWebhook)
	}
}

func setupAnalyticsRoutes(router *gin.Engine, db *sqlx.DB) {
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

func setupAdminRoutes(router *gin.Engine, db *sqlx.DB) {
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

func setupHealthRoutes(router *gin.Engine) {
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	router.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "land-valuation-api",
		})
	})
}
