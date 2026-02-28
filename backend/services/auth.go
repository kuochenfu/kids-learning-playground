package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/chenfu/kids-learning-playground/backend/config"
	"github.com/chenfu/kids-learning-playground/backend/models"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/idtoken"
	"gorm.io/gorm"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// VerifyGoogleToken verifies the ID token received from frontend
func (s *AuthService) VerifyGoogleToken(idToken string) (*models.User, error) {
	// Verify Token with Google
	payload, err := idtoken.Validate(context.Background(), idToken, s.cfg.GoogleClientID)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %v", err)
	}

	claims := payload.Claims
	email := claims["email"].(string)
	name := claims["name"].(string)
	picture := claims["picture"].(string)

	var user models.User
	result := s.db.Where("email = ?", email).First(&user)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// New User - default to child for now unless specific logic for parent is needed
		user = models.User{
			Email:   email,
			Name:    name,
			Picture: picture,
			Role:    models.RoleChild, 
		}
		
		// If email matches your typical parent email pattern or explicitly specified
		// You might want to hardcode your email as parent for now
		if email == "frankuo@gmail.com" { // Placeholder for your email
			user.Role = models.RoleParent
		}

		if err := s.db.Create(&user).Error; err != nil {
			return nil, err
		}
	}

	return &user, nil
}

// GenerateJWT creates a token for our application session
func (s *AuthService) GenerateJWT(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"exp":   time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
