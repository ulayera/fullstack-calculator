package service

import (
	"errors"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

type parserMock struct{ mock.Mock }

func (m *parserMock) Parse(input string) (expression.Node, []string) {
	args := m.Called(input)
	node, _ := args.Get(0).(expression.Node)
	errs, _ := args.Get(1).([]string)
	return node, errs
}

type nodeMock struct{ mock.Mock }

func (m *nodeMock) Eval() (decimal.Decimal, error) {
	args := m.Called()
	return args.Get(0).(decimal.Decimal), args.Error(1)
}

func evaluatingTo(value string, err error) *nodeMock {
	n := &nodeMock{}
	n.On("Eval").Return(decimal.RequireFromString(value), err).Once()
	return n
}

func TestValidateReturnsParserErrors(t *testing.T) {
	p := &parserMock{}
	p.On("Parse", "3*").Return(nil, []string{"incomplete"}).Once()

	errs := NewCalculatorService(p).Validate("3*")

	assert.Equal(t, []string{"incomplete"}, errs)
	p.AssertExpectations(t)
}

func TestValidateReturnsNoErrorsForParsableInput(t *testing.T) {
	p := &parserMock{}
	p.On("Parse", "4+5").Return(&nodeMock{}, nil).Once()

	assert.Empty(t, NewCalculatorService(p).Validate("4+5"))
	p.AssertExpectations(t)
}

func TestCalculateReturnsParserErrorsWithoutEvaluating(t *testing.T) {
	p := &parserMock{}
	p.On("Parse", "2(3)").Return(nil, []string{"implicit"}).Once()

	calc, errs, err := NewCalculatorService(p).Calculate("2(3)")

	require.NoError(t, err)
	assert.Equal(t, Calculation{}, calc)
	assert.Equal(t, []string{"implicit"}, errs)
}

func TestCalculateRoundsResultAndKeepsExactValue(t *testing.T) {
	node := evaluatingTo("0.6666666666666666666666666666666667", nil)
	p := &parserMock{}
	p.On("Parse", "2/3").Return(node, nil).Once()

	calc, errs, err := NewCalculatorService(p).Calculate("2/3")

	require.NoError(t, err)
	assert.Empty(t, errs)
	assert.Equal(t, Calculation{Result: "0.6666666666666667", Exact: "0.6666666666666666666666666666666667"}, calc)
	node.AssertExpectations(t)
}

func TestCalculateRoundsHalfAwayFromZero(t *testing.T) {
	cases := map[string]string{
		"0.00000000000000005":  "0.0000000000000001",
		"-0.00000000000000005": "-0.0000000000000001",
		"0.00000000000000004":  "0",
		"-0.00000000000000004": "0",
		"0.99999999999999995":  "1",
		"2.50000000000000000":  "2.5",
		"12345678901234567890": "12345678901234567890",
	}
	for value, want := range cases {
		t.Run(value, func(t *testing.T) {
			p := &parserMock{}
			p.On("Parse", "x").Return(evaluatingTo(value, nil), nil).Once()

			calc, _, _ := NewCalculatorService(p).Calculate("x")

			assert.Equal(t, want, calc.Result)
		})
	}
}

func TestCalculateReturnsUndefinedOnDivisionByZero(t *testing.T) {
	p := &parserMock{}
	p.On("Parse", "1/0").Return(evaluatingTo("0", expression.ErrDivisionByZero), nil).Once()

	calc, errs, err := NewCalculatorService(p).Calculate("1/0")

	require.NoError(t, err)
	assert.Empty(t, errs)
	assert.Equal(t, Calculation{Result: Undefined}, calc)
}

func TestCalculatePropagatesUnexpectedEvaluationErrors(t *testing.T) {
	boom := errors.New("boom")
	p := &parserMock{}
	p.On("Parse", "x").Return(evaluatingTo("0", boom), nil).Once()

	_, _, err := NewCalculatorService(p).Calculate("x")

	assert.ErrorIs(t, err, boom)
}

func TestCalculateProofCasesWithRealParser(t *testing.T) {
	cases := map[string]Calculation{
		"1/3":                                    {Result: "0.3333333333333333", Exact: "0.3333333333333333333333333333333333"},
		"2/3":                                    {Result: "0.6666666666666667", Exact: "0.6666666666666666666666666666666667"},
		"0.1+0.2":                                {Result: "0.3", Exact: "0.3"},
		"1/3*3":                                  {Result: "1", Exact: "0.9999999999999999999999999999999999"},
		"8/2*4":                                  {Result: "16", Exact: "16"},
		"2+3*4":                                  {Result: "14", Exact: "14"},
		"-(2+3)":                                 {Result: "-5", Exact: "-5"},
		"2*-3":                                   {Result: "-6", Exact: "-6"},
		"2--2":                                   {Result: "4", Exact: "4"},
		"0.3333333333333333333333333333333333*3": {Result: "1", Exact: "0.9999999999999999999999999999999999"},
		"0.3333333333333333*3":                   {Result: "0.9999999999999999", Exact: "0.9999999999999999"},
		"1/0":                                    {Result: Undefined},
	}
	svc := NewCalculatorService(expression.Parser{})
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			calc, errs, err := svc.Calculate(input)

			require.NoError(t, err)
			assert.Empty(t, errs)
			assert.Equal(t, want, calc)
		})
	}
}

func TestCalculateRejectsWithRealParser(t *testing.T) {
	svc := NewCalculatorService(expression.Parser{})
	for _, input := range []string{"--3", "2(3)", "3*", "5.", "(2", ""} {
		t.Run(input, func(t *testing.T) {
			_, errs, err := svc.Calculate(input)

			require.NoError(t, err)
			assert.NotEmpty(t, errs)
		})
	}
}
