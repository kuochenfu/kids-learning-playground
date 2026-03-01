package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kuochenfu/kids-learning-playground/backend/config"
	"github.com/kuochenfu/kids-learning-playground/backend/models"
	"github.com/kuochenfu/kids-learning-playground/backend/services"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize Database
	db, err := gorm.Open(postgres.Open(cfg.DBDSN), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// Auto Migrate
	if err := db.AutoMigrate(&models.User{}, &models.GameSession{}, &models.Question{}); err != nil {
		log.Printf("Migration failed: %v", err)
	} else {
		log.Println("Database migrated successfully")
	}

	// Initial Seeding v10 (High Quality Stable)
	const TargetVersion = "DB_VERSION_V10_STABLE"
	var metaQ models.Question
	db.Where("category = ? AND text = ?", "meta", TargetVersion).First(&metaQ)

	var count int64
	db.Model(&models.Question{}).Count(&count)

	if metaQ.ID == 0 || count < 100 {
		log.Printf("🔄 DB Version Mismatch or Incomplete (Count: %d). Force Overwriting with %s...", count, TargetVersion)
		// More robust table reset
		db.Migrator().DropTable(&models.Question{})
		db.AutoMigrate(&models.Question{})
		seedQuestions(db)
		db.Model(&models.Question{}).Count(&count)
		log.Printf("✅ DB fully refreshed to %s! Total count: %d", TargetVersion, count)
	} else {
		log.Printf("✅ DB already at %s. Verified count: %d", TargetVersion, count)
	}

	authService := services.NewAuthService(db, cfg)

	r := gin.Default()

	// CORS Configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://kids-learning-playground.pages.dev"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API Routes
	api := r.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		api.GET("/health", func(c *gin.Context) {
			var qCount int64
			db.Model(&models.Question{}).Count(&qCount)

			var categories []string
			db.Model(&models.Question{}).Distinct("category").Pluck("category", &categories)

			c.JSON(http.StatusOK, gin.H{
				"status":         "ok",
				"database":       "connected",
				"question_count": qCount,
				"categories":     categories,
			})
		})

		// 1. Auth Endpoint: Receives ID Token from Frontend
		api.POST("/auth/google", func(c *gin.Context) {
			var body struct {
				Credential string `json:"credential"`
			}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
				return
			}

			user, err := authService.VerifyGoogleToken(body.Credential)
			if err != nil {
				log.Printf("Google verification failed: %v", err)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "google authentication failed", "details": err.Error()})
				return
			}

			token, err := authService.GenerateJWT(user)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate session"})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"token": token,
				"user":  user,
			})
		})

		// 2. Protected Routes (require Authorization header)
		protected := api.Group("/")
		protected.Use(AuthMiddleware(cfg.JWTSecret))
		{
			protected.POST("/score", func(c *gin.Context) {
				var session models.GameSession
				if err := c.ShouldBindJSON(&session); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Set UserID from context
				userID, _ := c.Get("userID")
				session.UserID = userID.(uint)

				if err := db.Create(&session).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save score"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"status": "captured", "id": session.ID})
			})

			protected.GET("/achievements", func(c *gin.Context) {
				userID, _ := c.Get("userID")
				var sessions []models.GameSession
				db.Where("user_id = ?", userID).Order("created_at desc").Find(&sessions)
				c.JSON(http.StatusOK, sessions)
			})

			protected.GET("/questions", func(c *gin.Context) {
				category := c.Query("category")
				limitInt := 10 // Reset to 10 for better pace

				var questions []models.Question
				// Ensure meta records aren't returned to players
				result := db.Where("category = ?", category).Order("RANDOM()").Limit(limitInt).Find(&questions)

				if result.Error != nil {
					log.Printf("Error fetching questions for %s: %v", category, result.Error)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch questions"})
					return
				}

				log.Printf("Fetched %d questions for category: %s", len(questions), category)
				c.JSON(http.StatusOK, questions)
			})
		}
	}

	fmt.Printf("Server starting on port %s...\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

// AuthMiddleware ...
func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header is missing"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token", "details": err.Error()})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "failed to parse claims"})
			return
		}

		userID := uint(claims["sub"].(float64))
		c.Set("userID", userID)
		c.Set("userRole", claims["role"])
		c.Next()
	}
}

//go:embed questions.json
var embeddedQuestions []byte

func seedQuestions(db *gorm.DB) {
	var questions []models.Question
	if err := json.Unmarshal(embeddedQuestions, &questions); err != nil {
		log.Printf("CRITICAL: Error unmarshalling embedded questions: %v", err)
		return
	}

	// Use batch insert for efficiency
	if err := db.CreateInBatches(questions, 100).Error; err != nil {
		log.Printf("CRITICAL: Failed to batch insert questions: %v", err)
	} else {
		log.Printf("Successfully seeded %d questions!", len(questions))
	}
}
