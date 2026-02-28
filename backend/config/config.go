package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DBDSN              string
	JWTSecret         string
	GoogleClientID     string
	GoogleClientSecret string
	RedirectURI        string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		DBDSN:              getEnv("DB_DSN", ""),
		JWTSecret:         getEnv("JWT_SECRET", "yui-default-secret"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		RedirectURI:        getEnv("REDIRECT_URI", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
