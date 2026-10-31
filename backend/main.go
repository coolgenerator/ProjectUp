package main

import (
	"log"
	"os"
	"projectup/config"
	"projectup/controllers"
	"projectup/database"
	_ "projectup/docs"
	"projectup/handlers"
	"projectup/helper"
	"projectup/middleware"
	"projectup/repositories"
	"projectup/routes"
	"projectup/services"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	// Get mode from environment variable, default to development
	mode := os.Getenv("APP_MODE")
	if mode == "" {
		mode = "development"
	}

	// Set Gin mode based on APP_MODE
	switch mode {
	case "production":
		gin.SetMode(gin.ReleaseMode)
	case "test":
		gin.SetMode(gin.TestMode)
	default:
		gin.SetMode(gin.DebugMode)
	}
	log.Printf("Application running in %s mode", mode)

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Redis cache
	redisConfig := config.LoadRedisConfig()
	cacheService, err := services.NewCacheService(redisConfig.URL())
	if err != nil {
		log.Printf("Warning: Failed to initialize Redis cache: %v", err)
		// Continue without cache - application can still run
		cacheService = nil
	} else {
		log.Println("Redis cache initialized successfully")
		defer cacheService.Close()
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}

	router := gin.New()
	router.Use(gin.Logger())

	// Inject cache service if available
	if cacheService != nil {
		router.Use(middleware.InjectCache(cacheService))
	}

	// Configure CORS based on mode
	corsConfig := cors.Config{
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Content-Type",
			"Authorization",
			"Origin",
			"Accept",
			"X-Requested-With",
			"Access-Control-Request-Method",
			"Access-Control-Request-Headers",
			"Content-Disposition",
			"Content-Length",
			"Cache-Control",
			"Pragma",
			"Expires",
		},
		AllowCredentials: true,
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
	}

	switch mode {
	case "production":
		corsConfig.AllowOrigins = []string{"https://projectup.me", "https://www.projectup.me"}
	case "development":
		corsConfig.AllowOrigins = []string{"http://localhost:5173"}
	default:
		corsConfig.AllowAllOrigins = true
	}

	// Add CORS middleware before any other middleware
	router.Use(cors.New(corsConfig))

	routes.AuthRoutes(router, cfg)
	routes.UserRoutes(router)
	routes.SetupGenericRoutes(router)
	routes.SetupProjectRoutes(router)
	routes.SetupWorkspaceRoutes(router) // Hierarchical workspace management
	routes.SetupShareLinkRoutes(router)  // Share link management with tracking
	routes.RegisterMeetingRoutes(router)
	routes.RegisterChatRoutes(router)
	routes.WSRoutes(router)
	routes.SSERoutes(router)                    // Server-Sent Events for real-time updates
	routes.NodeChatNotificationRoutes(router)   // Multi-user node chat notifications
	routes.RegisterContactRoutes(router)
	routes.ProjectDashboardRoutes(router) // Simplified version without blocks
	routes.RegisterNotificationRoutes(router)
	routes.RegisterGeneralPostRoutes(router)
	routes.TutorialRoutes(router) // User onboarding tutorials
	routes.SetupAgentRoutes(router)
	routes.SetupIdeaMatchRoutes(router) // Idea workbench + AI matching

	// Initialize task components
	taskRepo := repositories.NewTaskRepository(database.DB)
	taskService := services.NewTaskService(taskRepo)
	taskController := controllers.NewTaskController(taskService)
	routes.SetupTaskRoutes(router, taskController)

	// Initialize section components
	sectionRepo := repositories.NewSectionRepository(database.DB)
	sectionService := services.NewSectionService(sectionRepo)
	sectionController := controllers.NewSectionController(sectionService)
	routes.SetupSectionRoutes(router, sectionController)

	// routes.SuggestionRoutes(router) // COMMENTED OUT: Temporarily disabled while using UserSkill and UserInterest models directly
	// routes.SetupBlockAssistantRoutes(router) // Removed - no longer using block-based design
	routes.SetupInteractionRoutes(router)
	// routes.SetupBlockEditorRoutes(router) // Removed - no longer using block-based design
	routes.SetupLearningRoutes(router)
	routes.SetupTrendingRoutes(router)
	routes.SetupBookmarkRoutes(router)
	routes.SetupBulkRoutes(router)
	routes.SetupPaperRoutes(router)
	routes.SetupSubscriptionRoutes(router)
	routes.RegisterKnowledgeTreeRoutes(router)
	// Note: EditorJS routes are now consolidated in the block router

	// Initialize resource components
	fileHelper, err := helper.NewFileHelper()
	if err != nil {
		log.Printf("Warning: Failed to initialize file helper: %v", err)
	}
	resourceRepo := repositories.NewResourceRepository(database.DB)
	resourceService := services.NewResourceService(resourceRepo, fileHelper)
	resourceController := controllers.NewResourceController(resourceService)
	routes.ResourceRoutes(router, resourceController)

	// Initialize partner post components
	partnerRepo := repositories.NewPartnerRepository(database.DB)
	partnerService := services.NewPartnerService(partnerRepo)
	partnerHandler := handlers.NewPartnerHandler(partnerService)

	// Register partner routes
	routes.RegisterPartnerRoutes(router, partnerHandler, middleware.Authenticate())

	if os.Getenv("ENV") != "production" {
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// Remind founders about applications left unanswered for 48 hours
	controllers.StartApplicationReminders()

	// Clean expired email verification records
	go func() {
		for {
			helper.CleanupOldRecords()
			time.Sleep(1 * time.Hour)
		}
	}()

	router.Run(":" + port)
}
