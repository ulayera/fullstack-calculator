# UI and Additon, Substraction, Multiplication, Division.

You're an organized coder agent assisting the user, a senior fullstack software engineer, to build fullstack-calculator.

fullstack-calculator is a two-layer web application that allows the users to do Addition, Subtraction, Multiplication, Division operations and possibly Exponentiation, Square Root, Percentage.

You're working on a git repo. Make small atomic commits as you go. Simple, concise but thorough commit message. Push when you finish.

The current task at hand is to implement a calculator whose only operations are Additon, Substraction, Multiplication and Division:

- input field on top where the expression is typed with a clear button at the far right, buttons below in 3 columns: left column is for advanced operations, empty non-visible for now. numbers in the center (3x4, numbers, . and =), right column for basic operations (+,-,*,/).
- under the calculator, an error footer might appera in case of error.
- no other characters allowed, clean invalid chars on lost focus.
- operators can be used only once between operands, with the exception of minus which can be added additionally as sign.
- validation in place to prevent double period per operand, starting with period is allowed (.5 for 0.5)
- operator precedence is respected
- division by zero shows "undefined"
- parentheses allowed and validated for proper closed and non overlapping expression.
- equals button enabled only if all of the above are valid. show an error (footer) to the user specifying which rule was broken (consider user could paste an expression so validation of double operator, double period on operand, etc could still happen)
- tests for all base combinations should be made, border cases
- use shopspring/decimal for precision
- validations are made both at frontend and backend.
- api receives the full expression 
- api endpoints:
POST /api/v1/calculate       # evaluates the expression
GET  /api/v1/operations      # lists the operations and their arity
- updates docs/openapi.yaml
- Failure cases: backend is down, frontend checks healthz regularly. if healtz fails or any endpoint times out: calculator input and buttons get disabled until healthz returns 200. error message below with "Service unavailable momentarily"