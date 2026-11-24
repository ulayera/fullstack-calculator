package service

import (
	"errors"

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
	Validate(input string) []string
	Calculate(input string) (Calculation, []string, error)
}

type calculatorService struct {
	parser Parser
}

func NewCalculatorService(p Parser) CalculatorService {
	return calculatorService{parser: p}
}

func (s calculatorService) Validate(input string) []string {
	_, errs := s.parser.Parse(input)
	return errs
}

func (s calculatorService) Calculate(input string) (Calculation, []string, error) {
	node, errs := s.parser.Parse(input)
	if len(errs) > 0 {
		return Calculation{}, errs, nil
	}
	value, err := node.Eval()
	if errors.Is(err, expression.ErrDivisionByZero) {
		return Calculation{Result: Undefined}, nil, nil
	}
	if err != nil {
		return Calculation{}, nil, err
	}
	return Calculation{Result: value.Round(ResultPlaces).String(), Exact: value.String()}, nil, nil
}
