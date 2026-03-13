package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DBDSN              string
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	RedirectURI        string
	AdminEmail         string
	ParentEmails       []string
	CookieSecure       bool
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	parentEmails := []string{}
	if raw := getEnv("PARENT_EMAILS", "frankuo@gmail.com"); raw != "" {
		for _, e := range strings.Split(raw, ",") {
			if trimmed := strings.TrimSpace(e); trimmed != "" {
				parentEmails = append(parentEmails, trimmed)
			}
		}
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		DBDSN:              getEnv("DB_DSN", ""),
		JWTSecret:          getEnv("JWT_SECRET", "yui-default-secret"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		RedirectURI:        getEnv("REDIRECT_URI", ""),
		AdminEmail:         getEnv("ADMIN_EMAIL", "kuochenfu@gmail.com"),
		ParentEmails:       parentEmails,
		CookieSecure:       getEnv("COOKIE_SECURE", "false") == "true",
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
