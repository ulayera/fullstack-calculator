package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

type HealthHandler struct {
	service service.HealthService
}

func NewHealthHandler(s service.HealthService) *HealthHandler {
	return &HealthHandler{service: s}
}

func (h *HealthHandler) Get(c *gin.Context) {
	c.JSON(http.StatusOK, h.service.Check())
}
