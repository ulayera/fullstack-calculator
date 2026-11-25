package expression

import (
	"math"
	"strconv"

	"github.com/shopspring/decimal"
)

const (
	DefaultPowerLimit = 100000
	MaxPowerLimit     = 100000000
	mantissaDigits    = 17
	guardDigits       = 10
	workFactor        = 10
)

type Work struct {
	remaining int64
}

func NewWork(limit int64) *Work {
	return &Work{remaining: workFactor * limit}
}

func (w *Work) spend(digits int64) bool {
	w.remaining -= digits
	return w.remaining >= 0
}

var nearOne = decimal.New(1, -2)

type Power struct {
	Base     Node
	Exponent Node
	Limit    int64
	Work     *Work
}

func (p Power) Eval() (decimal.Decimal, error) {
	base, err := p.Base.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	exponent, err := p.Exponent.Eval()
	if err != nil {
		return decimal.Decimal{}, err
	}
	v, err := power(base, exponent, p.Limit, p.Work)
	return bounded(v, err, p.Limit)
}

func power(base, exponent decimal.Decimal, limit int64, work *Work) (decimal.Decimal, error) {
	switch {
	case exponent.IsZero():
		return one, nil
	case base.IsZero() && exponent.IsNegative():
		return decimal.Decimal{}, ErrDivisionByZero
	case base.IsZero():
		return base, nil
	case base.IsNegative() && !exponent.IsInteger():
		return decimal.Decimal{}, ErrImaginary
	}
	magnitude := log10Power(base, exponent)
	if math.Abs(magnitude) > float64(limit) {
		return decimal.Decimal{}, ErrPowerLimit
	}
	if !exponent.IsInteger() || exponent.IsNegative() {
		v, err := base.PowWithPrecision(exponent, significantPlaces(magnitude))
		if err != nil {
			return decimal.Decimal{}, ErrPowerLimit
		}
		return v.Round(DivisionPrecision - 1 - leadingExponent(v)), nil
	}
	if digits := exactDigits(base, exponent, magnitude); digits.LessThanOrEqual(decimal.NewFromInt(limit + 1)) {
		if !work.spend(digits.IntPart()) {
			return decimal.Decimal{}, ErrPowerLimit
		}
		return base.PowBigInt(exponent.BigInt())
	}
	inverse, err := base.PowWithPrecision(exponent.Neg(), significantPlaces(-magnitude))
	if err != nil {
		return decimal.Decimal{}, ErrPowerLimit
	}
	return divide(one, inverse)
}

func significantPlaces(magnitude float64) int32 {
	return DivisionPrecision - 1 + guardDigits - int32(math.Floor(magnitude))
}

func exactDigits(base, exponent decimal.Decimal, magnitude float64) decimal.Decimal {
	whole := decimal.NewFromFloat(math.Floor(max(magnitude, 0)) + 1)
	scale := decimal.NewFromInt(int64(max(-base.Exponent(), 0)))
	return whole.Add(exponent.Mul(scale))
}

func log10Power(base, exponent decimal.Decimal) float64 {
	sign := float64(exponent.Sign())
	if base.Abs().LessThan(one) {
		sign = -sign
	}
	return sign * math.Pow(10, log10Abs(exponent)+log10Log10Abs(base))
}

func log10Log10Abs(d decimal.Decimal) float64 {
	abs := d.Abs()
	distance := abs.Sub(one)
	if distance.IsZero() {
		return math.Inf(-1)
	}
	if distance.Abs().GreaterThanOrEqual(nearOne) {
		return math.Log10(math.Abs(log10Abs(abs)))
	}
	ratio := 1.0
	if t := distance.InexactFloat64(); t != 0 {
		ratio = math.Log1p(t) / t
	}
	return log10Abs(distance) + math.Log10(ratio/math.Ln10)
}

func log10Abs(d decimal.Decimal) float64 {
	digits := d.Coefficient()
	digits.Abs(digits)
	text := digits.String()
	lead := float64(len(text)-1) + float64(d.Exponent())
	mantissa, _ := strconv.ParseFloat(text[:1]+"."+text[1:min(len(text), mantissaDigits)], 64)
	return lead + math.Log10(mantissa)
}
