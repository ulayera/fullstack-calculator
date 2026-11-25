package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ulayera/fullstack-calculator/backend/internal/config"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
	"github.com/ulayera/fullstack-calculator/backend/internal/handler"
	"github.com/ulayera/fullstack-calculator/backend/internal/router"
	"github.com/ulayera/fullstack-calculator/backend/internal/server"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	powerLimit, err := config.PowerLimit(os.LookupEnv)
	if err != nil {
		log.Fatal(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatal(err)
	}

	health := handler.NewHealthHandler(service.NewHealthService())
	calculator := handler.NewCalculatorHandler(service.NewCalculatorService(expression.Parser{PowerLimit: powerLimit}))
	srv := server.New(router.New(health, calculator))
	log.Printf("listening on %s", ln.Addr())
	if err := server.Run(ctx, srv, ln, 10*time.Second); err != nil {
		log.Fatal(err)
	}
	log.Print("server stopped")
}
