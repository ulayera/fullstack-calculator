package service

import (
	"errors"

	"github.com/shopspring/decimal"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

const (
	ResultPlaces = 16
	Undefined    = "undefined"
)

type Parser interface {
	Parse(input string) (expression.Node, []string)
}

type Calculation struct {
	Result string `json:"result"`
	Exact  string `json:"exact,omitempty"`
}

type CalculatorService interface {
	Validate(input string) ([]string, error)
	Calculate(input string) (Calculation, []string, error)
}

type calculatorService struct {
	parser Parser
}

func NewCalculatorService(p Parser) CalculatorService {
	return calculatorService{parser: p}
}

func (s calculatorService) Validate(input string) ([]string, error) {
	_, _, errs, err := s.evaluate(input)
	return errs, err
}

func (s calculatorService) Calculate(input string) (Calculation, []string, error) {
	value, undefined, errs, err := s.evaluate(input)
	switch {
	case len(errs) > 0 || err != nil:
		return Calculation{}, errs, err
	case undefined:
		return Calculation{Result: Undefined}, nil, nil
	}
	return Calculation{Result: value.Round(ResultPlaces).String(), Exact: value.String()}, nil, nil
}

func (s calculatorService) evaluate(input string) (decimal.Decimal, bool, []string, error) {
	node, errs := s.parser.Parse(input)
	if len(errs) > 0 {
		return decimal.Decimal{}, false, errs, nil
	}
	value, err := node.Eval()
	if errors.Is(err, expression.ErrDivisionByZero) {
		return decimal.Decimal{}, true, nil, nil
	}
	return value, false, nil, err
}
