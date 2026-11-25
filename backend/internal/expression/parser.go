package expression

import "github.com/shopspring/decimal"

type descent struct {
	tokens     []Token
	pos        int
	powerLimit int64
	work       *Work
}

type Parser struct {
	PowerLimit int64
}

func (parser Parser) Parse(input string) (Node, []string) {
	tokens, errs := validate(input)
	if len(errs) > 0 {
		return nil, errs
	}
	p := &descent{tokens: tokens, powerLimit: parser.PowerLimit, work: NewWork(parser.PowerLimit)}
	return p.expression(), nil
}

func (p *descent) accept(kinds ...Kind) (Kind, bool) {
	if p.pos >= len(p.tokens) {
		return 0, false
	}
	k := p.tokens[p.pos].Kind
	for _, want := range kinds {
		if k == want {
			p.pos++
			return k, true
		}
	}
	return 0, false
}

func (p *descent) expression() Node {
	left := p.term()
	for {
		op, ok := p.accept(Plus, Minus)
		if !ok {
			return left
		}
		left = Binary{Op: op, Left: left, Right: p.term(), Limit: p.powerLimit}
	}
}

func (p *descent) term() Node {
	left := p.unary()
	for {
		op, ok := p.accept(Star, Slash, Percent)
		if !ok {
			return left
		}
		left = Binary{Op: op, Left: left, Right: p.unary(), Limit: p.powerLimit}
	}
}

func (p *descent) unary() Node {
	if _, ok := p.accept(Minus); ok {
		return Negate{Operand: p.unary()}
	}
	if _, ok := p.accept(Root); ok {
		return SquareRoot{Operand: p.unary()}
	}
	return p.power()
}

func (p *descent) power() Node {
	base := p.primary()
	if _, ok := p.accept(Caret); ok {
		return Power{Base: base, Exponent: p.unary(), Limit: p.powerLimit, Work: p.work}
	}
	return base
}

func (p *descent) primary() Node {
	if _, ok := p.accept(LParen); ok {
		inner := p.expression()
		p.pos++
		return inner
	}
	t := p.tokens[p.pos]
	p.pos++
	return Literal{Value: decimal.RequireFromString(t.Text)}
}
