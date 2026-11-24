#  Square root, Percentage and Exponentiation

You're an organized coder agent assisting the user, a senior fullstack software engineer, to build fullstack-calculator.

fullstack-calculator is a two-layer web application that allows the users to do Addition, Subtraction, Multiplication, Division operations and possibly Exponentiation, Square Root, Percentage.

You're working on a git repo. Make small atomic commits as you go. Simple, concise but thorough commit message. Push when you finish.

The current task at hand is to implement Square root, Percentage and Exponentiation:

Layout:

- Left column is for advanced operations, empty non-visible until now (3x2 grid).
- Make % button bigger to shows"% of" in its label. 

Validations:

- Full expression Validations are made at backend, frontend uses /validate.
- Some UI validations are made on frontend (pasting, characters, occurrences, etc)
- Only V (sqrt),%,^ are added to allowed chars.
- Power needs this validation: if (|b * log10(|a|)| > 100000) return error 422 error message: "power operation refused due to computation limit exceeded". keep the 100000 number configurable as .env var.
- Binary operators can be used only once between operands.

Operations behaviors:

- V4 or √4 means "sqrt(4)", result is error "imaginary numbers not supported" if operand is negative. unary operator. V is converted to √ automatically for easier use.
- 20%300 means "20 % of 300". binary operator.
- 2^32 means "power(2, 32)" as in power(base, exponent), binary operator.
- equals button enabled only if all of the validations are valid. show an error (footer) to the user specifying which rule was broken.

- operators precedence:
```
    From highest to lowest:
    1. parentheses
    2. ^, right-associative
    3. unary minus and V, right-associative
    4. *, / and %, left-associative
    5. + and -, left-associative

    A%B means A*B/100. That makes it a kind of multiplication, so it sits at the same level as *. It's binary, so it no longer conflicts with the "one operator between operands" rule. That leaves V and the minus sign as the only unary exceptions.

    Examples:
    - 2^3^2 = 512
    - -2^2 = -4
    - 2^-1 = 0.5
    - V4*4 = 8
    - V16^0.5 = 2
    - 10%200 = 20
    - 5+10%50 = 10
    - 100/10%50 = 5, read left to right: (100/10)%50
    - 10%2^3 = 0.8, because ^ binds first
```

Rounding:
```
- Compute V and fractional powers to 34 digits.
- Round only the final result, never intermediate values.
```

API contract:
- POST /api/v1/calculate
    - 422 { "errors": ["Error"] } (for computation limit)
- POST /api/v1/validate
    - 422 { "errors": ["Error"] } (for computation limit)
- uses the existing endpoints, request, response and status codes.

Coder notes:
- tests for all base combinations should be made, border cases, including the ones in the validations.
- use shopspring/decimal for precision
- api receives the full expression
- updates docs/openapi.yaml
- update coverage report just for assignment purposes.

