package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

type healthServiceMock struct{ mock.Mock }

func (m *healthServiceMock) Check() service.HealthStatus {
	return m.Called().Get(0).(service.HealthStatus)
}

func TestHealthHandlerGetRespondsWithServiceStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &healthServiceMock{}
	svc.On("Check").Return(service.HealthStatus{Status: "degraded"}).Once()
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)

	NewHealthHandler(svc).Get(c)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"degraded"}`, rec.Body.String())
	svc.AssertExpectations(t)
}
