package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/ulayera/fullstack-calculator/backend/internal/service"
)

type calculatorServiceMock struct{ mock.Mock }

func (m *calculatorServiceMock) Validate(input string) []string {
	errs, _ := m.Called(input).Get(0).([]string)
	return errs
}

func (m *calculatorServiceMock) Calculate(input string) (service.Calculation, []string, error) {
	args := m.Called(input)
	errs, _ := args.Get(1).([]string)
	return args.Get(0).(service.Calculation), errs, args.Error(2)
}

func call(action func(*gin.Context), body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	action(c)
	return rec
}

func TestValidateRespondsOkWhenServiceFindsNoErrors(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Validate", "4+5").Return(nil).Once()

	rec := call(NewCalculatorHandler(svc).Validate, `{"expression":"4+5"}`)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"result":"Ok"}`, rec.Body.String())
	svc.AssertExpectations(t)
}

func TestValidateRespondsBadRequestWithServiceErrors(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Validate", "3*").Return([]string{"a", "b"}).Once()

	rec := call(NewCalculatorHandler(svc).Validate, `{"expression":"3*"}`)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.JSONEq(t, `{"errors":["a","b"]}`, rec.Body.String())
}

func TestValidatePassesEmptyExpressionToService(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Validate", "").Return([]string{"empty"}).Once()

	rec := call(NewCalculatorHandler(svc).Validate, `{"expression":""}`)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	svc.AssertExpectations(t)
}

func TestHandlersRejectMalformedBodiesWithoutCallingService(t *testing.T) {
	bodies := []string{``, `nope`, `{}`, `{"expression":null}`, `{"expression":4}`, `[]`, `{"expression":"` + strings.Repeat("1", MaxBodyBytes) + `"}`}
	svc := &calculatorServiceMock{}
	h := NewCalculatorHandler(svc)
	for _, action := range []func(*gin.Context){h.Validate, h.Calculate} {
		for _, body := range bodies {
			rec := call(action, body)

			assert.Equal(t, http.StatusBadRequest, rec.Code, body)
			assert.JSONEq(t, `{"errors":["`+InvalidBodyMsg+`"]}`, rec.Body.String())
		}
	}
	svc.AssertNotCalled(t, "Validate", mock.Anything)
	svc.AssertNotCalled(t, "Calculate", mock.Anything)
}

func TestCalculateRespondsWithResultAndExact(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Calculate", "1/3").Return(service.Calculation{Result: "0.3", Exact: "0.33"}, nil, nil).Once()

	rec := call(NewCalculatorHandler(svc).Calculate, `{"expression":"1/3"}`)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"result":"0.3","exact":"0.33"}`, rec.Body.String())
}

func TestCalculateRespondsUndefinedWithoutExact(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Calculate", "1/0").Return(service.Calculation{Result: "undefined"}, nil, nil).Once()

	rec := call(NewCalculatorHandler(svc).Calculate, `{"expression":"1/0"}`)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"result":"undefined"}`, rec.Body.String())
}

func TestCalculateRespondsBadRequestWithServiceErrors(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Calculate", "2(3)").Return(service.Calculation{}, []string{"implicit"}, nil).Once()

	rec := call(NewCalculatorHandler(svc).Calculate, `{"expression":"2(3)"}`)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.JSONEq(t, `{"errors":["implicit"]}`, rec.Body.String())
}

func TestCalculateRespondsInternalErrorOnUnexpectedFailure(t *testing.T) {
	svc := &calculatorServiceMock{}
	svc.On("Calculate", "x").Return(service.Calculation{}, nil, errors.New("boom")).Once()

	rec := call(NewCalculatorHandler(svc).Calculate, `{"expression":"x"}`)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.JSONEq(t, `{"errors":["Internal error"]}`, rec.Body.String())
}
