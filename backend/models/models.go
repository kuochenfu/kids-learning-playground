package models

import (
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	RoleParent UserRole = "parent"
	RoleChild  UserRole = "child"
)

type User struct {
	gorm.Model
	Email   string   `gorm:"uniqueIndex;not null" json:"email"`
	Name    string   `json:"name"`
	Picture string   `json:"picture"`
	Role    UserRole `gorm:"default:'child'" json:"role"`
}

type GameSession struct {
	gorm.Model
	UserID       uint      `gorm:"not null" json:"userId"`
	GameID       string    `gorm:"not null" json:"gameId"`
	Score        int       `json:"score"`
	Duration     int       `json:"duration"` // in seconds
	WrongAnswers []string  `gorm:"type:text[]" json:"wrongAnswers"`
	Timestamp    time.Time `json:"timestamp"`
}

type Question struct {
	gorm.Model
	Category string   `gorm:"index" json:"category"`
	Text     string   `json:"text"`
	Options  []string `gorm:"serializer:json;type:text" json:"options"`
	Answer   string   `json:"answer"`
	Fact     string   `json:"fact"`
}
