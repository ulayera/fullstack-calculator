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

type calculatorHandlerMock struct{ mock.Mock }

func (m *calculatorHandlerMock) Validate(c *gin.Context) {
	m.Called(c)
	c.Status(http.StatusAccepted)
}

func (m *calculatorHandlerMock) Calculate(c *gin.Context) {
	m.Called(c)
	c.Status(http.StatusCreated)
}

func newRouter() (*gin.Engine, *healthHandlerMock, *calculatorHandlerMock) {
	gin.SetMode(gin.TestMode)
	h, calc := &healthHandlerMock{}, &calculatorHandlerMock{}
	return New(h, calc), h, calc
}

func serve(r *gin.Engine, method, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestRouterRoutesHealthzToHealthHandler(t *testing.T) {
	r, h, _ := newRouter()
	h.On("Get", mock.Anything).Once()

	rec := serve(r, http.MethodGet, "/api/v1/healthz")

	assert.Equal(t, http.StatusTeapot, rec.Code)
	h.AssertExpectations(t)
}

func TestRouterRoutesValidateToCalculatorHandler(t *testing.T) {
	r, _, calc := newRouter()
	calc.On("Validate", mock.Anything).Once()

	rec := serve(r, http.MethodPost, "/api/v1/validate")

	assert.Equal(t, http.StatusAccepted, rec.Code)
	calc.AssertExpectations(t)
}

func TestRouterRoutesCalculateToCalculatorHandler(t *testing.T) {
	r, _, calc := newRouter()
	calc.On("Calculate", mock.Anything).Once()

	rec := serve(r, http.MethodPost, "/api/v1/calculate")

	assert.Equal(t, http.StatusCreated, rec.Code)
	calc.AssertExpectations(t)
}

func TestRouterReturnsNotFoundForUnknownRoute(t *testing.T) {
	r, h, _ := newRouter()

	rec := serve(r, http.MethodGet, "/api/v1/unknown")

	assert.Equal(t, http.StatusNotFound, rec.Code)
	h.AssertNotCalled(t, "Get", mock.Anything)
}

func TestRouterRejectsWrongMethodsWithMethodNotAllowed(t *testing.T) {
	cases := map[string]string{
		"/api/v1/healthz":   http.MethodPost,
		"/api/v1/validate":  http.MethodGet,
		"/api/v1/calculate": http.MethodGet,
	}
	for path, method := range cases {
		r, h, calc := newRouter()

		rec := serve(r, method, path)

		assert.Equal(t, http.StatusMethodNotAllowed, rec.Code, path)
		h.AssertNotCalled(t, "Get", mock.Anything)
		calc.AssertNotCalled(t, "Validate", mock.Anything)
		calc.AssertNotCalled(t, "Calculate", mock.Anything)
	}
}
