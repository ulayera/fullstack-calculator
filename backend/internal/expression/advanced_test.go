package expression

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseEvaluatesAdvancedOperations(t *testing.T) {
	cases := map[string]string{
		"2^3^2":                          "512",
		"-2^2":                           "-4",
		"2^-1":                           "0.5",
		"V4*4":                           "8",
		"√4*4":                           "8",
		"V16^0.5":                        "2",
		"10%200":                         "20",
		"5+10%50":                        "10",
		"100/10%50":                      "5",
		"10%2^3":                         "0.8",
		"20%300":                         "60",
		"2^32":                           "4294967296",
		"√4":                             "2",
		"V0":                             "0",
		"√0.25":                          "0.5",
		"√1000000":                       "1000",
		"√2":                             "1.414213562373095048801688724209698",
		"√0.0002":                        "0.01414213562373095048801688724209698",
		"√200":                           "14.14213562373095048801688724209698",
		"√√16":                           "2",
		"-√4":                            "-2",
		"√(2+2)":                         "2",
		"√4^2":                           "4",
		"2^√4":                           "4",
		"(-2)^2":                         "4",
		"(-2)^3":                         "-8",
		"(-2)^-3":                        "-0.125",
		"2^0":                            "1",
		"0^0":                            "1",
		"0^2":                            "0",
		"0^0.5":                          "0",
		"1^0.5":                          "1",
		"2^0.5":                          "1.414213562373095048801688724209698",
		"4^-0.5":                         "0.5",
		"8^(1/3)":                        "2",
		"3^-1":                           "0.3333333333333333333333333333333333",
		"1.5^2":                          "2.25",
		"0.1^3":                          "0.001",
		"(2^3)^2":                        "64",
		"-2^-2":                          "-0.25",
		"2*3^2":                          "18",
		"2^3*2":                          "16",
		"2^3%50":                         "4",
		"50%10%10":                       "0.5",
		"10%-50":                         "-5",
		"-10%50":                         "-5",
		"10%(2+3)":                       "0.5",
		"0.5%0.5":                        "0.0025",
		"2+3^2-√9*2":                     "5",
		"√(3^2+4^2)":                     "5",
		"1.0000001^90000":                "1.009040621319799564637711697175767",
		"(-1)^1000000000000000000000001": "-1",
		"1^99999999999999999999999.5":    "1",
	}
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			got, err := eval(t, input)
			require.NoError(t, err)
			assert.Equal(t, want, got)
		})
	}
}

func TestParseEvaluatesPowersAtTheLimitBoundary(t *testing.T) {
	cases := map[string]int{
		"10^100000":   100001,
		"0.1^-100000": 100001,
		"2^332192":    100000,
		"(-10)^99999": 100001,
	}
	for input, length := range cases {
		t.Run(input, func(t *testing.T) {
			got, err := eval(t, input)
			require.NoError(t, err)
			assert.Equal(t, length, len(got))
		})
	}
}

func TestParseReportsUnprocessableOnEval(t *testing.T) {
	cases := map[string]error{
		"√-4":          ErrImaginary,
		"V(2-5)":       ErrImaginary,
		"√-0.0001":     ErrImaginary,
		"(-8)^0.5":     ErrImaginary,
		"(-8)^(1/3)":   ErrImaginary,
		"1+√-1":        ErrImaginary,
		"10^100001":    ErrPowerLimit,
		"10^-100001":   ErrPowerLimit,
		"0.1^100001":   ErrPowerLimit,
		"2^332193":     ErrPowerLimit,
		"(-2)^332193":  ErrPowerLimit,
		"10^(10^6)":    ErrPowerLimit,
		"2^3^20":       ErrPowerLimit,
		"10^100000.5":  ErrPowerLimit,
		"1.1^99999999": ErrPowerLimit,
		"1.00000000000000000001^100000000000000000000000000":  ErrPowerLimit,
		"0.99999999999999999999^-100000000000000000000000000": ErrPowerLimit,
		"9^" + strings.Repeat("9", 400):                       ErrPowerLimit,
	}
	for input, want := range cases {
		name := input
		if len(name) > 30 {
			name = name[:30]
		}
		t.Run(name, func(t *testing.T) {
			_, err := eval(t, input)
			assert.ErrorIs(t, err, want)
		})
	}
}

func TestParseReportsDivisionByZeroInPowers(t *testing.T) {
	for _, input := range []string{"0^-1", "0^-0.5", "(1-1)^-2", "(1/0)^2", "2^(1/0)", "√(1/0)"} {
		t.Run(input, func(t *testing.T) {
			_, err := eval(t, input)
			assert.ErrorIs(t, err, ErrDivisionByZero)
		})
	}
}

func TestPowerHonoursTheConfiguredLimit(t *testing.T) {
	node, errs := Parser{PowerLimit: 3}.Parse("10^3+10^-3")
	require.Empty(t, errs)
	v, err := node.Eval()
	require.NoError(t, err)
	assert.Equal(t, "1000.001", v.String())

	node, _ = Parser{PowerLimit: 3}.Parse("10^4")
	_, err = node.Eval()
	assert.ErrorIs(t, err, ErrPowerLimit)
}

func TestUnprocessableErrorsCarryTheirMessage(t *testing.T) {
	assert.EqualError(t, ErrImaginary, "imaginary numbers not supported")
	assert.EqualError(t, ErrPowerLimit, "power operation refused due to computation limit exceeded")
}

func TestParseRejectsInvalidAdvancedExpressions(t *testing.T) {
	cases := map[string][]string{
		"√":     {"Incomplete expression: missing operand after '√' at position 1"},
		"V":     {"Incomplete expression: missing operand after 'V' at position 1"},
		"2^":    {"Incomplete expression: missing operand after '^' at position 2"},
		"20%":   {"Incomplete expression: missing operand after '%' at position 3"},
		"^2":    {"Operator '^' at position 1 is missing its left operand"},
		"%2":    {"Operator '%' at position 1 is missing its left operand"},
		"2^^3":  {"Operator '^' at position 3 is missing its left operand"},
		"2%%3":  {"Operator '%' at position 3 is missing its left operand"},
		"2^*3":  {"Operator '*' at position 3 is missing its left operand"},
		"2*^3":  {"Operator '^' at position 3 is missing its left operand"},
		"2%^3":  {"Operator '^' at position 3 is missing its left operand"},
		"2+%3":  {"Operator '%' at position 3 is missing its left operand"},
		"√*4":   {"Operator '*' at position 2 is missing its left operand"},
		"√^4":   {"Operator '^' at position 2 is missing its left operand"},
		"2^--3": {"Minus sign at position 4 repeats a sign; only one is allowed"},
		"√--4":  {"Minus sign at position 3 repeats a sign; only one is allowed"},
		"2√4":   {"Implicit multiplication is not allowed at position 2"},
		"(2)√4": {"Implicit multiplication is not allowed at position 4"},
		"(√)":   {"Missing operand after '√' at position 2"},
		"(2^)":  {"Missing operand after '^' at position 3"},
		"√(":    {"Unclosed '(' at position 2"},
		"2^(3":  {"Unclosed '(' at position 3"},
		"3*":    {"Incomplete expression: missing operand after '*' at position 2"},
	}
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			node, errs := Parser{PowerLimit: DefaultPowerLimit}.Parse(input)
			assert.Nil(t, node)
			assert.Equal(t, want, errs)
		})
	}
}

func TestLexTreatsVAndRadicalAsTheSameToken(t *testing.T) {
	v, _ := Lex("V4")
	radical, _ := Lex("√4")

	assert.Equal(t, Root, v[0].Kind)
	assert.Equal(t, Root, radical[0].Kind)
	assert.Equal(t, 2, radical[1].Pos)
}

func TestPowerSurfacesRangeErrorsWhenTheLimitExceedsDecimalRange(t *testing.T) {
	for _, exponent := range []string{"1500000000", "1500000000.5"} {
		t.Run(exponent, func(t *testing.T) {
			_, err := power(decimal.NewFromInt(10), decimal.RequireFromString(exponent), 2000000000)

			assert.Error(t, err)
			assert.NotErrorIs(t, err, ErrPowerLimit)
		})
	}
}
