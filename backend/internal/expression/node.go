package expression

import (
	"errors"

	"github.com/shopspring/decimal"
)

const DivisionPrecision = 34

var ErrDivisionByZero = errors.New("division by zero")

type Node interface {
	Eval() (decimal.Decimal, error)
}

type Literal struct {
	Value decimal.Decimal
}

func (l Literal) Eval() (decimal.Decimal, error) {
	return l.Value, nil
}

type Negate struct {
	Operand Node
}

func (n Negate) Eval() (decimal.Decimal, error) {
	v, err := n.Operand.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	return v.Neg(), nil
}

type Binary struct {
	Op    Kind
	Left  Node
	Right Node
}

func (b Binary) Eval() (decimal.Decimal, error) {
	left, err := b.Left.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	right, err := b.Right.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	switch b.Op {
	case Plus:
		return left.Add(right), nil
	case Minus:
		return left.Sub(right), nil
	case Star:
		return left.Mul(right), nil
	}
	if right.IsZero() {
		return decimal.Decimal{}, ErrDivisionByZero
	}
	return left.DivRound(right, divisionPlaces(left, right)), nil
}

func leadingExponent(d decimal.Decimal) int32 {
	return int32(d.NumDigits()) + d.Exponent() - 1
}

func divisionPlaces(left, right decimal.Decimal) int32 {
	if left.IsZero() {
		return 0
	}
	exponent := leadingExponent(left) - leadingExponent(right)
	if right.Abs().Shift(exponent).Cmp(left.Abs()) > 0 {
		exponent--
	}
	return DivisionPrecision - 1 - exponent
}
