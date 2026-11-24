package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type healthHandlerMock struct{ mock.Mock }

func (m *healthHandlerMock) Get(c *gin.Context) {
	m.Called(c)
	c.Status(http.StatusTeapot)
}

func serve(r *gin.Engine, method, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestRouterRoutesHealthzToHealthHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &healthHandlerMock{}
	h.On("Get", mock.Anything).Once()

	rec := serve(New(h), http.MethodGet, "/api/v1/healthz")

	assert.Equal(t, http.StatusTeapot, rec.Code)
	h.AssertExpectations(t)
}

func TestRouterReturnsNotFoundForUnknownRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &healthHandlerMock{}

	rec := serve(New(h), http.MethodGet, "/api/v1/unknown")

	assert.Equal(t, http.StatusNotFound, rec.Code)
	h.AssertNotCalled(t, "Get", mock.Anything)
}

func TestRouterRejectsNonGetOnHealthzWithMethodNotAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &healthHandlerMock{}

	rec := serve(New(h), http.MethodPost, "/api/v1/healthz")

	assert.Equal(t, http.StatusMethodNotAllowed, rec.Code)
	h.AssertNotCalled(t, "Get", mock.Anything)
}
