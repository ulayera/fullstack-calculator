package expression

import "fmt"

type Kind int

const (
	Number Kind = iota
	Plus
	Minus
	Star
	Slash
	LParen
	RParen
	Caret
	Percent
	Root
)

type Token struct {
	Kind Kind
	Text string
	Pos  int
}

var symbols = map[rune]Kind{
	'+': Plus,
	'-': Minus,
	'*': Star,
	'/': Slash,
	'(': LParen,
	')': RParen,
	'^': Caret,
	'%': Percent,
	'√': Root,
	'V': Root,
}

func isNumberRune(r rune) bool {
	return r == '.' || (r >= '0' && r <= '9')
}

func Lex(input string) ([]Token, []string) {
	runes := []rune(input)
	var tokens []Token
	var errs []string
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if kind, ok := symbols[r]; ok {
			tokens = append(tokens, Token{Kind: kind, Text: string(r), Pos: i + 1})
			continue
		}
		if !isNumberRune(r) {
			errs = append(errs, fmt.Sprintf("Invalid character '%c' at position %d", r, i+1))
			continue
		}
		start := i
		for i+1 < len(runes) && isNumberRune(runes[i+1]) {
			i++
		}
		tokens = append(tokens, Token{Kind: Number, Text: string(runes[start : i+1]), Pos: start + 1})
	}
	return tokens, errs
}
