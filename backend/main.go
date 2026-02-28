package main

import (
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
	db.AutoMigrate(&models.User{}, &models.GameSession{}, &models.Question{})
	log.Println("Database migrated successfully")

	// Initial Seeding
	var count int64
	db.Model(&models.Question{}).Count(&count)
	if count == 0 {
		seedQuestions(db)
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
				limitInt := 10

				var questions []models.Question
				// Using Random order for Postgres (RANDOM() function)
				result := db.Where("category = ?", category).Order("RANDOM()").Limit(limitInt).Find(&questions)

				if result.Error != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch questions"})
					return
				}

				c.JSON(http.StatusOK, questions)
			})
		}
	}

	fmt.Printf("Server starting on port %s...\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
func seedQuestions(db *gorm.DB) {
	questions := []models.Question{
		// Science
		{Category: "science", Text: "Which planet is known as the Red Planet?", Options: []string{"Venus", "Mars", "Jupiter", "Saturn"}, Answer: "Mars", Fact: "Mars has iron oxide on its surface, giving it a reddish look."},
		{Category: "science", Text: "What is the largest animal on Earth?", Options: []string{"Elephant", "Blue Whale", "Giraffe", "Shark"}, Answer: "Blue Whale", Fact: "Its tongue alone can weigh as much as an elephant!"},
		{Category: "science", Text: "How many legs does a spider have?", Options: []string{"6", "8", "10", "12"}, Answer: "8", Fact: "Spiders are arachnids, not insects!"},
		{Category: "science", Text: "What gas do humans need to breathe to live?", Options: []string{"Nitrogen", "Oxygen", "Carbon Dioxide", "Hydrogen"}, Answer: "Oxygen", Fact: "Oxygen is produced by plants through photosynthesis."},
		{Category: "science", Text: "Which is the boiling point of water?", Options: []string{"50°C", "100°C", "150°C", "200°C"}, Answer: "100°C", Fact: "At sea level, water boils exactly at 100 degrees Celsius."},
		{Category: "science", Text: "What is the center of an atom called?", Options: []string{"Electron", "Proton", "Nucleus", "Neutron"}, Answer: "Nucleus", Fact: "The nucleus contains protons and neutrons."},
		{Category: "science", Text: "What is the closest star to Earth?", Options: []string{"Sirius", "Sun", "Alpha Centauri", "Polaris"}, Answer: "Sun", Fact: "The Sun provides the energy needed for life on Earth."},
		{Category: "science", Text: "How many bones are in the adult human body?", Options: []string{"106", "206", "306", "406"}, Answer: "206", Fact: "You are born with more bones, but some fuse together as you grow."},
		{Category: "science", Text: "What part of the plant grows underground?", Options: []string{"Leaf", "Stem", "Root", "Flower"}, Answer: "Root", Fact: "Roots absorb water and nutrients from the soil."},
		{Category: "science", Text: "What is the hardest natural substance on Earth?", Options: []string{"Gold", "Iron", "Diamond", "Quartz"}, Answer: "Diamond", Fact: "Diamonds are made of pure carbon."},

		// Logic
		{Category: "logic", Text: "If 1=5, 2=25, 3=125, what does 5 equal?", Options: []string{"625", "3125", "1", "5"}, Answer: "1", Fact: "If 1=5, then 5=1!"},
		{Category: "logic", Text: "Complete the sequence: 2, 4, 8, 16, ?", Options: []string{"20", "24", "30", "32"}, Answer: "32", Fact: "Each number is double the previous one."},
		{Category: "logic", Text: "What comes next: Triangle, Square, Pentagon, ?", Options: []string{"Circle", "Hexagon", "Octagon", "Star"}, Answer: "Hexagon", Fact: "The number of sides increases by one (3, 4, 5, 6)."},
		{Category: "logic", Text: "Which month has 28 days?", Options: []string{"February", "January", "June", "All of them"}, Answer: "All of them", Fact: "Every month has at least 28 days!"},
		{Category: "logic", Text: "If you have 3 apples and you take away 2, how many apples do you have?", Options: []string{"1", "2", "3", "5"}, Answer: "2", Fact: "You took 2, so you have 2!"},
		{Category: "logic", Text: "What has keys but can't open locks?", Options: []string{"Door", "Piano", "Chest", "Box"}, Answer: "Piano", Fact: "Pianos have keys that make music, not open doors."},
		{Category: "logic", Text: "I follow you all day long, but when the sun goes down I'm gone. What am I?", Options: []string{"Wind", "Shadow", "Bird", "Cloud"}, Answer: "Shadow", Fact: "Shadows need light to exist."},
		{Category: "logic", Text: "What goes up but never comes down?", Options: []string{"Balloon", "Age", "Plane", "Bird"}, Answer: "Age", Fact: "You only get older, never younger!"},
		{Category: "logic", Text: "What has eyes but can't see?", Options: []string{"Needle", "Potato", "Storm", "All of above"}, Answer: "All of above", Fact: "A needle has an eye, a potato has eyes, and a storm has an eye!"},
		{Category: "logic", Text: "What belongs to you but others use it more than you?", Options: []string{"Money", "Name", "House", "Car"}, Answer: "Name", Fact: "Others call you by your name more than you say it yourself!"},
	}

	for _, q := range questions {
		db.Create(&q)
	}
	log.Println("Seeding completed successfully!")
}

// AuthMiddleware - Verifies our custom JWT
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
