package expression

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

const MaxLength = 16384

func validate(input string) ([]Token, []string) {
	if input == "" {
		return nil, []string{"Expression is empty"}
	}
	if utf8.RuneCountInString(input) > MaxLength {
		return nil, []string{fmt.Sprintf("Expression exceeds %d characters", MaxLength)}
	}
	tokens, errs := Lex(input)
	if len(errs) > 0 {
		return nil, errs
	}
	errs = append(errs, checkNumbers(tokens)...)
	errs = append(errs, checkParentheses(tokens)...)
	errs = append(errs, checkSequence(tokens)...)
	return tokens, errs
}

func isBinary(k Kind) bool {
	return k == Plus || k == Minus || k == Star || k == Slash || k == Caret || k == Percent
}

func needsOperand(k Kind) bool {
	return isBinary(k) || k == Root
}

func expectsOperand(prev *Token) bool {
	return prev == nil || prev.Kind == LParen || needsOperand(prev.Kind)
}

func checkNumbers(tokens []Token) []string {
	var errs []string
	for _, t := range tokens {
		if t.Kind != Number {
			continue
		}
		switch {
		case strings.Count(t.Text, ".") > 1:
			errs = append(errs, fmt.Sprintf("Number '%s' at position %d has more than one decimal point", t.Text, t.Pos))
		case strings.HasSuffix(t.Text, "."):
			errs = append(errs, fmt.Sprintf("Number '%s' at position %d cannot end with a decimal point", t.Text, t.Pos))
		}
	}
	return errs
}

func checkSequence(tokens []Token) []string {
	var errs []string
	var prev *Token
	prevIsSign := false
	for i := range tokens {
		t := &tokens[i]
		isSign := false
		switch t.Kind {
		case Number, LParen, Root:
			if !expectsOperand(prev) {
				errs = append(errs, fmt.Sprintf("Implicit multiplication is not allowed at position %d", t.Pos))
			}
		case RParen:
			if prev != nil && prev.Kind == LParen {
				errs = append(errs, fmt.Sprintf("Empty parentheses at position %d", prev.Pos))
			} else if prev != nil && needsOperand(prev.Kind) {
				errs = append(errs, fmt.Sprintf("Missing operand after '%s' at position %d", prev.Text, prev.Pos))
			}
		case Minus:
			isSign = expectsOperand(prev)
			if isSign && prevIsSign {
				errs = append(errs, fmt.Sprintf("Minus sign at position %d repeats a sign; only one is allowed", t.Pos))
			}
		default:
			if expectsOperand(prev) {
				errs = append(errs, fmt.Sprintf("Operator '%s' at position %d is missing its left operand", t.Text, t.Pos))
			}
		}
		prevIsSign = isSign
		prev = t
	}
	if prev != nil && needsOperand(prev.Kind) {
		errs = append(errs, fmt.Sprintf("Incomplete expression: missing operand after '%s' at position %d", prev.Text, prev.Pos))
	}
	return errs
}

func checkParentheses(tokens []Token) []string {
	var errs []string
	var open []int
	for _, t := range tokens {
		switch t.Kind {
		case LParen:
			open = append(open, t.Pos)
		case RParen:
			if len(open) == 0 {
				errs = append(errs, fmt.Sprintf("Unmatched ')' at position %d", t.Pos))
				continue
			}
			open = open[:len(open)-1]
		}
	}
	for _, pos := range open {
		errs = append(errs, fmt.Sprintf("Unclosed '(' at position %d", pos))
	}
	return errs
}
