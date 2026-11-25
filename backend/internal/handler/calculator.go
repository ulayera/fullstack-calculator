package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

const (
	MaxBodyBytes   = 64 << 10
	InvalidBodyMsg = "Request body must be a JSON object with a string 'expression'"
	InternalMsg    = "Internal error"
	Ok             = "Ok"
)

type expressionRequest struct {
	Expression *string `json:"expression" binding:"required"`
}

type errorsResponse struct {
	Errors []string `json:"errors"`
}

type CalculatorHandler struct {
	service service.CalculatorService
}

func NewCalculatorHandler(s service.CalculatorService) *CalculatorHandler {
	return &CalculatorHandler{service: s}
}

func bindExpression(c *gin.Context) (string, bool) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
	var req expressionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorsResponse{Errors: []string{InvalidBodyMsg}})
		return "", false
	}
	return *req.Expression, true
}

func respondFailure(c *gin.Context, errs []string, err error) bool {
	var unprocessable expression.Unprocessable
	switch {
	case errors.As(err, &unprocessable):
		c.JSON(http.StatusUnprocessableEntity, errorsResponse{Errors: []string{unprocessable.Error()}})
	case err != nil:
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, errorsResponse{Errors: []string{InternalMsg}})
	case len(errs) > 0:
		c.JSON(http.StatusBadRequest, errorsResponse{Errors: errs})
	default:
		return false
	}
	return true
}

func (h *CalculatorHandler) Validate(c *gin.Context) {
	input, ok := bindExpression(c)
	if !ok {
		return
	}
	if errs, err := h.service.Validate(input); respondFailure(c, errs, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"result": Ok})
}

func (h *CalculatorHandler) Calculate(c *gin.Context) {
	input, ok := bindExpression(c)
	if !ok {
		return
	}
	calc, errs, err := h.service.Calculate(input)
	if respondFailure(c, errs, err) {
		return
	}
	c.JSON(http.StatusOK, calc)
}
