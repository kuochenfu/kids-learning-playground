package services

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kuochenfu/kids-learning-playground/backend/config"
	"github.com/kuochenfu/kids-learning-playground/backend/models"
)

var testConfig = &config.Config{
	JWTSecret:    "test-secret-key",
	ParentEmails: []string{"parent@test.com"},
}

func newTestService() *AuthService {
	return &AuthService{cfg: testConfig}
}

func TestGenerateJWT_ContainsClaims(t *testing.T) {
	svc := newTestService()
	user := &models.User{
		Email: "kid@test.com",
		Role:  models.RoleChild,
	}
	user.ID = 42

	tokenStr, err := svc.GenerateJWT(user)
	if err != nil {
		t.Fatalf("GenerateJWT returned error: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("GenerateJWT returned empty token")
	}

	parsed, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(testConfig.JWTSecret), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("Token is not valid: %v", err)
	}

	claims := parsed.Claims.(jwt.MapClaims)
	if claims["email"] != "kid@test.com" {
		t.Errorf("expected email=kid@test.com, got %v", claims["email"])
	}
	if claims["role"] != string(models.RoleChild) {
		t.Errorf("expected role=child, got %v", claims["role"])
	}

	// Expiry should be ~72 hours from now
	exp := int64(claims["exp"].(float64))
	minExp := time.Now().Add(71 * time.Hour).Unix()
	maxExp := time.Now().Add(73 * time.Hour).Unix()
	if exp < minExp || exp > maxExp {
		t.Errorf("exp %d is not within expected 72h window", exp)
	}
}

func TestGenerateJWT_ParentRole(t *testing.T) {
	svc := newTestService()
	user := &models.User{
		Email: "parent@test.com",
		Role:  models.RoleParent,
	}
	user.ID = 1

	tokenStr, _ := svc.GenerateJWT(user)
	parsed, _ := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(testConfig.JWTSecret), nil
	})
	claims := parsed.Claims.(jwt.MapClaims)
	if claims["role"] != string(models.RoleParent) {
		t.Errorf("expected role=parent, got %v", claims["role"])
	}
}

// authMiddleware extracted for test reuse — mirrors main.go
func authMiddlewareFunc(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("jwt")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		claims := token.Claims.(jwt.MapClaims)
		c.Set("userID", uint(claims["sub"].(float64)))
		c.Set("userEmail", claims["email"])
		c.Next()
	}
}

func makeValidToken(t *testing.T, secret string, userID uint, email string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub":   float64(userID),
		"email": email,
		"role":  "child",
		"exp":   time.Now().Add(72 * time.Hour).Unix(),
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to create test token: %v", err)
	}
	return tok
}

func TestAuthMiddleware_ValidCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(authMiddlewareFunc("test-secret-key"))
	router.GET("/test", func(c *gin.Context) {
		id, _ := c.Get("userID")
		c.JSON(http.StatusOK, gin.H{"userID": id})
	})

	tok := makeValidToken(t, "test-secret-key", 7, "kid@test.com")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.AddCookie(&http.Cookie{Name: "jwt", Value: tok})
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthMiddleware_MissingCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(authMiddlewareFunc("test-secret-key"))
	router.GET("/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "not authenticated") {
		t.Errorf("expected 'not authenticated' in body, got: %s", w.Body.String())
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(authMiddlewareFunc("test-secret-key"))
	router.GET("/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.AddCookie(&http.Cookie{Name: "jwt", Value: "totally-not-a-valid-jwt"})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_WrongSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(authMiddlewareFunc("correct-secret"))
	router.GET("/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	tok := makeValidToken(t, "wrong-secret", 1, "test@test.com")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.AddCookie(&http.Cookie{Name: "jwt", Value: tok})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
