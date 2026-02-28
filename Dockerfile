# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application - correctly pointing to the backend subdirectory
RUN go build -o main backend/main.go

# Run stage
FROM alpine:latest  
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/main .
COPY --from=builder /app/backend/.env .

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
