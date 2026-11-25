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

	errs, err := NewCalculatorService(p).Validate("3*")

	require.NoError(t, err)
	assert.Equal(t, []string{"incomplete"}, errs)
	p.AssertExpectations(t)
}

func TestValidateEvaluatesParsableInput(t *testing.T) {
	node := evaluatingTo("9", nil)
	p := &parserMock{}
	p.On("Parse", "4+5").Return(node, nil).Once()

	errs, err := NewCalculatorService(p).Validate("4+5")

	require.NoError(t, err)
	assert.Empty(t, errs)
	node.AssertExpectations(t)
}

func TestValidateAcceptsDivisionByZero(t *testing.T) {
	p := &parserMock{}
	p.On("Parse", "1/0").Return(evaluatingTo("0", expression.ErrDivisionByZero), nil).Once()

	errs, err := NewCalculatorService(p).Validate("1/0")

	require.NoError(t, err)
	assert.Empty(t, errs)
}

func TestValidateReturnsEvaluationErrors(t *testing.T) {
	for _, want := range []error{expression.ErrImaginary, expression.ErrPowerLimit, errors.New("boom")} {
		t.Run(want.Error(), func(t *testing.T) {
			p := &parserMock{}
			p.On("Parse", "x").Return(evaluatingTo("0", want), nil).Once()

			errs, err := NewCalculatorService(p).Validate("x")

			assert.Empty(t, errs)
			assert.ErrorIs(t, err, want)
		})
	}
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

func TestCalculatePropagatesEvaluationErrors(t *testing.T) {
	for _, want := range []error{expression.ErrImaginary, expression.ErrPowerLimit, errors.New("boom")} {
		t.Run(want.Error(), func(t *testing.T) {
			p := &parserMock{}
			p.On("Parse", "x").Return(evaluatingTo("0", want), nil).Once()

			calc, errs, err := NewCalculatorService(p).Calculate("x")

			assert.Equal(t, Calculation{}, calc)
			assert.Empty(t, errs)
			assert.ErrorIs(t, err, want)
		})
	}
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
		"2^3^2":                                  {Result: "512", Exact: "512"},
		"-2^2":                                   {Result: "-4", Exact: "-4"},
		"2^-1":                                   {Result: "0.5", Exact: "0.5"},
		"V4*4":                                   {Result: "8", Exact: "8"},
		"V16^0.5":                                {Result: "2", Exact: "2"},
		"10%200":                                 {Result: "20", Exact: "20"},
		"5+10%50":                                {Result: "10", Exact: "10"},
		"100/10%50":                              {Result: "5", Exact: "5"},
		"10%2^3":                                 {Result: "0.8", Exact: "0.8"},
		"20%300":                                 {Result: "60", Exact: "60"},
		"2^32":                                   {Result: "4294967296", Exact: "4294967296"},
		"√2":                                     {Result: "1.414213562373095", Exact: "1.414213562373095048801688724209698"},
		"√2*√2":                                  {Result: "2", Exact: "1.999999999999999999999999999999999777771408885275981220134677251204"},
		"2^0.5^2":                                {Result: "1.1892071150027211", Exact: "1.189207115002721066717499970560476"},
		"0^0":                                    {Result: "1", Exact: "1"},
		"0^-1":                                   {Result: Undefined},
	}
	svc := NewCalculatorService(expression.Parser{PowerLimit: expression.DefaultPowerLimit})
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			calc, errs, err := svc.Calculate(input)

			require.NoError(t, err)
			assert.Empty(t, errs)
			assert.Equal(t, want, calc)
		})
	}
}

func TestCalculateRefusesUnprocessableWithRealParser(t *testing.T) {
	cases := map[string]error{
		"√-4":       expression.ErrImaginary,
		"(-8)^0.5":  expression.ErrImaginary,
		"10^100001": expression.ErrPowerLimit,
		"2^332193":  expression.ErrPowerLimit,
	}
	svc := NewCalculatorService(expression.Parser{PowerLimit: expression.DefaultPowerLimit})
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			_, validateErr := svc.Validate(input)
			_, _, calculateErr := svc.Calculate(input)

			assert.ErrorIs(t, validateErr, want)
			assert.ErrorIs(t, calculateErr, want)
		})
	}
}

func TestCalculateRejectsWithRealParser(t *testing.T) {
	svc := NewCalculatorService(expression.Parser{PowerLimit: expression.DefaultPowerLimit})
	for _, input := range []string{"--3", "2(3)", "3*", "5.", "(2", "", "2^", "20%", "√", "2^^3", "2√4"} {
		t.Run(input, func(t *testing.T) {
			_, errs, err := svc.Calculate(input)

			require.NoError(t, err)
			assert.NotEmpty(t, errs)
		})
	}
}
