package router

import "github.com/gin-gonic/gin"

type HealthHandler interface {
	Get(c *gin.Context)
}

func New(health HealthHandler) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	v1 := r.Group("/api/v1")
	v1.GET("/healthz", health.Get)
	return r
}
