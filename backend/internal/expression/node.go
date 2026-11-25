package expression

import (
	"errors"

	"github.com/shopspring/decimal"
)

const DivisionPrecision = 34

var (
	ErrDivisionByZero = errors.New("division by zero")
	one               = decimal.NewFromInt(1)
)

type Unprocessable string

func (u Unprocessable) Error() string {
	return string(u)
}

const (
	ErrImaginary  Unprocessable = "imaginary numbers not supported"
	ErrPowerLimit Unprocessable = "power operation refused due to computation limit exceeded"
)

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
	Limit int64
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
	v, err := b.apply(left, right)
	return bounded(v, err, b.Limit)
}

func (b Binary) apply(left, right decimal.Decimal) (decimal.Decimal, error) {
	switch b.Op {
	case Plus:
		return left.Add(right), nil
	case Minus:
		return left.Sub(right), nil
	case Star:
		return left.Mul(right), nil
	case Percent:
		return left.Mul(right).Shift(-2), nil
	}
	return divide(left, right)
}

func bounded(v decimal.Decimal, err error, limit int64) (decimal.Decimal, error) {
	if err != nil || v.IsZero() {
		return v, err
	}
	budget := max(limit, MaxLength) + DivisionPrecision
	lead := int64(leadingExponent(v))
	if int64(v.NumDigits()) > budget || lead > budget || -lead > budget {
		return decimal.Decimal{}, ErrPowerLimit
	}
	return v, nil
}

type SquareRoot struct {
	Operand Node
}

func (s SquareRoot) Eval() (decimal.Decimal, error) {
	v, err := s.Operand.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	if v.IsNegative() {
		return decimal.Decimal{}, ErrImaginary
	}
	if v.IsZero() {
		return v, nil
	}
	return v.SqrtRound(DivisionPrecision - 1 - leadingExponent(v)>>1)
}

func divide(left, right decimal.Decimal) (decimal.Decimal, error) {
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
