#  Square root, Percentage and Exponentiation

You're an organized coder agent assisting the user, a senior fullstack software engineer, to build fullstack-calculator.

fullstack-calculator is a two-layer web application that allows the users to do Addition, Subtraction, Multiplication, Division operations and possibly Exponentiation, Square Root, Percentage.

You're working on a git repo. Make small atomic commits as you go. Simple, concise but thorough commit message. Push when you finish.

The current task at hand is to implement Square root, Percentage and Exponentiation

- only V,%,^ are added to allowed chars. buttons on the left column.
- operators can be used only once between operands.
- operators precedence is respected
- tests for all base combinations should be made, border cases
- use shopspring/decimal for precision
- validations are made both at frontend and backend.
- equals button enabled only if all of the above are valid. show a toltip to the user specifying which rule (consider user could paste an expression so validation of double operator, double period on operand, etc could still happen)
- api receives the full expression
- uses the existing endpoints
- updates docs/openapi.yaml