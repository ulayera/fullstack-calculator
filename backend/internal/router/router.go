package router

import "github.com/gin-gonic/gin"

type HealthHandler interface {
	Get(c *gin.Context)
}

type CalculatorHandler interface {
	Validate(c *gin.Context)
	Calculate(c *gin.Context)
}

func New(health HealthHandler, calculator CalculatorHandler) *gin.Engine {
	r := gin.New()
	r.HandleMethodNotAllowed = true
	r.Use(gin.Logger(), gin.Recovery())
	v1 := r.Group("/api/v1")
	v1.GET("/healthz", health.Get)
	v1.POST("/validate", calculator.Validate)
	v1.POST("/calculate", calculator.Calculate)
	return r
}
