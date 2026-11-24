package main

import (
	"log"
	"os"

	"github.com/ulayera/fullstack-calculator/backend/internal/handler"
	"github.com/ulayera/fullstack-calculator/backend/internal/router"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r := router.New(handler.NewHealthHandler(service.NewHealthService()))
	log.Fatal(r.Run(":" + port))
}
