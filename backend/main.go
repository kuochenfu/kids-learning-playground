package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kuochenfu/kids-learning-playground/backend/config"
	"github.com/kuochenfu/kids-learning-playground/backend/models"
	"github.com/kuochenfu/kids-learning-playground/backend/services"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Rate limiting — simple token bucket per IP
// ---------------------------------------------------------------------------

type ipBucket struct {
	tokens   float64
	lastSeen time.Time
	mu       sync.Mutex
}

var (
	ipBuckets   sync.Map
	bucketMu    sync.Mutex
	cleanupOnce sync.Once
)

func getRateLimiter(ip string) *ipBucket {
	v, _ := ipBuckets.LoadOrStore(ip, &ipBucket{tokens: 60, lastSeen: time.Now()})
	return v.(*ipBucket)
}

// rateLimitMiddleware allows `maxPerMin` requests per minute per IP.
func rateLimitMiddleware(maxPerMin float64) gin.HandlerFunc {
	// Clean up stale entries every 5 minutes
	cleanupOnce.Do(func() {
		go func() {
			for {
				time.Sleep(5 * time.Minute)
				ipBuckets.Range(func(k, v any) bool {
					b := v.(*ipBucket)
					b.mu.Lock()
					stale := time.Since(b.lastSeen) > 10*time.Minute
					b.mu.Unlock()
					if stale {
						ipBuckets.Delete(k)
					}
					return true
				})
			}
		}()
	})

	refillRate := maxPerMin / 60.0 // tokens per second

	return func(c *gin.Context) {
		ip := c.ClientIP()
		bucket := getRateLimiter(ip)

		bucket.mu.Lock()
		now := time.Now()
		elapsed := now.Sub(bucket.lastSeen).Seconds()
		bucket.tokens = min(maxPerMin, bucket.tokens+elapsed*refillRate)
		bucket.lastSeen = now

		if bucket.tokens < 1 {
			bucket.mu.Unlock()
			retryAfter := int(60.0 / maxPerMin)
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		bucket.tokens--
		bucket.mu.Unlock()
		c.Next()
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// ---------------------------------------------------------------------------
// Auth middleware — reads httpOnly cookie
// ---------------------------------------------------------------------------

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("jwt")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "failed to parse claims"})
			return
		}

		userID := uint(claims["sub"].(float64))
		c.Set("userID", userID)
		c.Set("userEmail", claims["email"])
		c.Set("userRole", claims["role"])
		c.Next()
	}
}

// ---------------------------------------------------------------------------
// Cookie helper
// ---------------------------------------------------------------------------

func setAuthCookie(c *gin.Context, token string, secure bool) {
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    token,
		Path:     "/",
		MaxAge:   72 * 3600,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func clearAuthCookie(c *gin.Context, secure bool) {
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

// ---------------------------------------------------------------------------
// Score request validation struct
// ---------------------------------------------------------------------------

type scoreRequest struct {
	GameID       string   `json:"gameId"       binding:"required"`
	Score        int      `json:"score"        binding:"min=0"`
	Duration     int      `json:"duration"     binding:"min=0"`
	WrongAnswers []string `json:"wrongAnswers"`
	Timestamp    string   `json:"timestamp"`
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

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

	// CORS — must list specific origins when AllowCredentials=true
	allowedOrigins := []string{"http://localhost:5173", "https://kids-learning-playground.pages.dev"}
	if envOrigins := os.Getenv("ALLOWED_ORIGINS"); envOrigins != "" {
		allowedOrigins = strings.Split(envOrigins, ",")
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	if cfg.JWTSecret == "yui-default-secret" {
		log.Println("⚠️  WARNING: Using default JWT secret! Please set JWT_SECRET environment variable in production.")
	}

	// Static files for uploaded images
	r.Static("/uploads", "./uploads")
	if err := os.MkdirAll("./uploads/puzzle", 0755); err != nil {
		log.Printf("Warning: Failed to create uploads directory: %v", err)
	}

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

		// Auth: rate-limited to 10 req/min per IP
		api.POST("/auth/google", rateLimitMiddleware(10), func(c *gin.Context) {
			var body struct {
				Credential string `json:"credential" binding:"required"`
			}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "credential is required"})
				return
			}

			user, err := authService.VerifyGoogleToken(body.Credential)
			if err != nil {
				log.Printf("Google verification failed: %v", err)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "google authentication failed"})
				return
			}

			token, err := authService.GenerateJWT(user)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate session"})
				return
			}

			setAuthCookie(c, token, cfg.CookieSecure)
			c.JSON(http.StatusOK, gin.H{"user": user})
		})

		// Logout: clear the cookie
		api.POST("/auth/logout", func(c *gin.Context) {
			clearAuthCookie(c, cfg.CookieSecure)
			c.JSON(http.StatusOK, gin.H{"message": "logged out"})
		})

		// Protected routes — rate limited to 60 req/min
		protected := api.Group("/")
		protected.Use(rateLimitMiddleware(60), AuthMiddleware(cfg.JWTSecret))
		{
			protected.POST("/score", func(c *gin.Context) {
				var req scoreRequest
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				userID, _ := c.Get("userID")
				session := models.GameSession{
					UserID:       userID.(uint),
					GameID:       req.GameID,
					Score:        req.Score,
					Duration:     req.Duration,
					WrongAnswers: req.WrongAnswers,
					Timestamp:    time.Now(),
				}

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
				if category == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "category is required"})
					return
				}
				limitInt := 10
				var questions []models.Question
				result := db.Where("category = ?", category).Order("RANDOM()").Limit(limitInt).Find(&questions)
				if result.Error != nil {
					log.Printf("Error fetching questions for %s: %v", category, result.Error)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch questions"})
					return
				}
				c.JSON(http.StatusOK, questions)
			})

			protected.GET("/puzzles", func(c *gin.Context) {
				var images []string
				images = append(images,
					"/assets/puzzle/kitten.png",
					"/assets/puzzle/space_kitten.png",
					"/assets/puzzle/artist_kitten.png",
					"/assets/puzzle/sleeping_kitten.png",
					"/assets/puzzle/garden_kitten.png",
					"/assets/puzzle/royal_kitten.png",
				)
				files, err := os.ReadDir("./uploads/puzzle")
				if err == nil {
					for _, f := range files {
						if f.IsDir() {
							continue
						}
						name := f.Name()
						if name == "default_kitten.png" || name == "space_kitten.png" ||
							name == "artist_kitten.png" || name == "sleeping_kitten.png" ||
							name == "garden_kitten.png" || name == "royal_kitten.png" {
							continue
						}
						ext := strings.ToLower(filepath.Ext(name))
						if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".webp" {
							images = append(images, "/uploads/puzzle/"+name)
						}
					}
				}
				c.JSON(http.StatusOK, images)
			})

			protected.POST("/puzzles/upload", func(c *gin.Context) {
				email, _ := c.Get("userEmail")
				if email != cfg.AdminEmail {
					c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
					return
				}

				file, err := c.FormFile("image")
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "no image provided"})
					return
				}
				if file.Size > 5*1024*1024 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "image too large (max 5MB)"})
					return
				}
				ext := strings.ToLower(filepath.Ext(file.Filename))
				allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
				if !allowed[ext] {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format (use jpg, png, or webp)"})
					return
				}
				filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
				savePath := filepath.Join("./uploads/puzzle", filename)
				if err := c.SaveUploadedFile(file, savePath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save image"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"url": "/uploads/puzzle/" + filename})
			})

			protected.DELETE("/puzzles/:filename", func(c *gin.Context) {
				email, _ := c.Get("userEmail")
				if email != cfg.AdminEmail {
					c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
					return
				}
				filename := c.Param("filename")
				if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
					return
				}
				filePath := filepath.Join("./uploads/puzzle", filename)
				if err := os.Remove(filePath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete file"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "deleted successfully"})
			})
		}
	}

	fmt.Printf("Server starting on port %s...\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
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
	if err := db.CreateInBatches(questions, 100).Error; err != nil {
		log.Printf("CRITICAL: Failed to batch insert questions: %v", err)
	} else {
		scienceCount, logicCount, metaCount := 0, 0, 0
		for _, q := range questions {
			switch q.Category {
			case "science":
				scienceCount++
			case "logic":
				logicCount++
			case "meta":
				metaCount++
			}
		}
		log.Printf("✅ Seeding Success: Total=%d, Science=%d, Logic=%d, Meta=%d", len(questions), scienceCount, logicCount, metaCount)
	}
}
