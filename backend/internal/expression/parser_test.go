package expression

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func eval(t *testing.T, input string) (string, error) {
	t.Helper()
	node, errs := Parser{}.Parse(input)
	require.Empty(t, errs, input)
	v, err := node.Eval()
	return v.String(), err
}

func TestParseEvaluatesValidExpressions(t *testing.T) {
	cases := map[string]string{
		"4+5":           "9",
		"9-4":           "5",
		"6*7":           "42",
		"8/2":           "4",
		"7":             "7",
		"0":             "0",
		"007":           "7",
		".5":            "0.5",
		".5+.5":         "1",
		"0.1+0.2":       "0.3",
		"1.5*2":         "3",
		"8/2*4":         "16",
		"2+3*4":         "14",
		"2*3+4":         "10",
		"10-4-3":        "3",
		"100/10/5":      "2",
		"2-3*4/2":       "-4",
		"(2+3)*4":       "20",
		"2*(3+4)":       "14",
		"((2))":         "2",
		"((1+2)*(3+4))": "21",
		"-(2+3)":        "-5",
		"-5":            "-5",
		"-.5":           "-0.5",
		"2*-3":          "-6",
		"2--2":          "4",
		"2+-2":          "0",
		"2/-4":          "-0.5",
		"-2*-3":         "6",
		"-(-3)":         "3",
		"(-3)":          "-3",
		"-(2)*3":        "-6",
		"1/3":           "0.3333333333333333333333333333333333",
		"2/3":           "0.6666666666666666666666666666666667",
		"-2/3":          "-0.6666666666666666666666666666666667",
		"1/3*3":         "0.9999999999999999999999999999999999",
		"5/3":           "1.666666666666666666666666666666667",
		"10/3":          "3.333333333333333333333333333333333",
		"100/7":         "14.28571428571428571428571428571429",
		"1/700":         "0.001428571428571428571428571428571429",
		"0/5":           "0",
		"-1/-3":         "0.3333333333333333333333333333333333",
		"1/100000000000000000000000000000000000*100000000000000000000000000000000000": "1",
		"1/3/1000000000*1000000000*3":                 "0.9999999999999999999999999999999999",
		"10000000000000000000000000000000000000000/3": "3333333333333333333333333333333333000000",
		"99999999999999999999*99999999999999999999":   "9999999999999999999800000000000000000001",
		"0.0000000000000000001*10":                    "0.000000000000000001",
	}
	for input, want := range cases {
		t.Run(input, func(t *testing.T) {
			got, err := eval(t, input)
			require.NoError(t, err)
			assert.Equal(t, want, got)
		})
	}
}

func TestParseReportsDivisionByZeroOnEval(t *testing.T) {
	for _, input := range []string{"1/0", "0/0", "1/(2-2)", "(1/0)*0", "-(1/0)", "0*(1/0)", "1/0+1", "1/-0", "1/0.000"} {
		t.Run(input, func(t *testing.T) {
			_, err := eval(t, input)
			assert.ErrorIs(t, err, ErrDivisionByZero)
		})
	}
}

func TestParseRejectsInvalidExpressions(t *testing.T) {
	cases := map[string][]string{
		"":        {"Expression is empty"},
		"2a3":     {"Invalid character 'a' at position 2"},
		"2 + 3":   {"Invalid character ' ' at position 2", "Invalid character ' ' at position 4"},
		"2^3":     {"Invalid character '^' at position 2"},
		"5%":      {"Invalid character '%' at position 2"},
		"1.2.3":   {"Number '1.2.3' at position 1 has more than one decimal point"},
		"5.":      {"Number '5.' at position 1 cannot end with a decimal point"},
		".":       {"Number '.' at position 1 cannot end with a decimal point"},
		"5.+1":    {"Number '5.' at position 1 cannot end with a decimal point"},
		"3*":      {"Incomplete expression: missing operand after '*' at position 2"},
		"3-":      {"Incomplete expression: missing operand after '-' at position 2"},
		"-":       {"Incomplete expression: missing operand after '-' at position 1"},
		"*3":      {"Operator '*' at position 1 is missing its left operand"},
		"+3":      {"Operator '+' at position 1 is missing its left operand"},
		"/3":      {"Operator '/' at position 1 is missing its left operand"},
		"2++3":    {"Operator '+' at position 3 is missing its left operand"},
		"2*/3":    {"Operator '/' at position 3 is missing its left operand"},
		"2-*3":    {"Operator '*' at position 3 is missing its left operand"},
		"2-+3":    {"Operator '+' at position 3 is missing its left operand"},
		"--3":     {"Minus sign at position 2 repeats a sign; only one is allowed"},
		"2---2":   {"Minus sign at position 4 repeats a sign; only one is allowed"},
		"2*--3":   {"Minus sign at position 4 repeats a sign; only one is allowed"},
		"(*3)":    {"Operator '*' at position 2 is missing its left operand"},
		"2(3)":    {"Implicit multiplication is not allowed at position 2"},
		"(2)3":    {"Implicit multiplication is not allowed at position 4"},
		"(2)(3)":  {"Implicit multiplication is not allowed at position 4"},
		"()":      {"Empty parentheses at position 1"},
		"2*()":    {"Empty parentheses at position 3"},
		"(2+)":    {"Missing operand after '+' at position 3"},
		"(2":      {"Unclosed '(' at position 1"},
		"((2)":    {"Unclosed '(' at position 1"},
		"2)":      {"Unmatched ')' at position 2"},
		")2(":     {"Unmatched ')' at position 1", "Unclosed '(' at position 3", "Implicit multiplication is not allowed at position 2", "Implicit multiplication is not allowed at position 3"},
		"(2))+(3": {"Unmatched ')' at position 4", "Unclosed '(' at position 6"},
		"1..2*+3-": {
			"Number '1..2' at position 1 has more than one decimal point",
			"Operator '+' at position 6 is missing its left operand",
			"Incomplete expression: missing operand after '-' at position 8",
		},
		strings.Repeat("1", MaxLength+1): {"Expression exceeds 16384 characters"},
	}
	for input, want := range cases {
		name := input
		if len(name) > 20 {
			name = "too long"
		}
		t.Run(name, func(t *testing.T) {
			node, errs := Parser{}.Parse(input)
			assert.Nil(t, node)
			assert.Equal(t, want, errs)
		})
	}
}

func TestParseAcceptsExpressionAtMaxLength(t *testing.T) {
	_, errs := Parser{}.Parse(strings.Repeat("1", MaxLength))

	assert.Empty(t, errs)
}

func TestLexReportsMultibyteCharactersByRunePosition(t *testing.T) {
	_, errs := Lex("2×3")

	assert.Equal(t, []string{"Invalid character '×' at position 2"}, errs)
}
