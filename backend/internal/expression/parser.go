package expression

import "github.com/shopspring/decimal"

type descent struct {
	tokens []Token
	pos    int
}

type Parser struct{}

func (Parser) Parse(input string) (Node, []string) {
	tokens, errs := validate(input)
	if len(errs) > 0 {
		return nil, errs
	}
	p := &descent{tokens: tokens}
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
		left = Binary{Op: op, Left: left, Right: p.term()}
	}
}

func (p *descent) term() Node {
	left := p.unary()
	for {
		op, ok := p.accept(Star, Slash)
		if !ok {
			return left
		}
		left = Binary{Op: op, Left: left, Right: p.unary()}
	}
}

func (p *descent) unary() Node {
	if _, ok := p.accept(Minus); ok {
		return Negate{Operand: p.unary()}
	}
	return p.primary()
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
