# UI and Additon, Substraction, Multiplication, Division.

You're an organized coder agent assisting the user, a senior fullstack software engineer, to build fullstack-calculator.

fullstack-calculator is a two-layer web application that allows the users to do Addition, Subtraction, Multiplication, Division operations and possibly Exponentiation, Square Root, Percentage.

You're working on a git repo. Make small atomic commits as you go. Simple, concise but thorough commit message. Push when you finish.

The current task at hand is to implement a calculator whose only operations are Additon, Substraction, Multiplication and Division:

Layout:
- Input field on top where the expression is typed with a clear button at the far right, buttons below in 3 columns: left column is for advanced operations, empty non-visible for now. numbers in the center (3x4 grid, numbers, . and =), right column (3x2 grid) for basic operations (+,-,*,/) and parentheses (,).
- under the calculator, an error footer might appera in case of error.

Validations:

- Full expression Validations are made at backend (250ms debounce), frontend uses /validate.
- Some UI validations are made on frontend (pasting, characters, occurrences, etc)
- No paste allowed (UI).
- Numbers, +,-,*,/ operations and parentheses (,), no other characters allowed (event blocked no user facing message needed).
- Binary operators can be used only once between operands, with the exception of minus which can be used additionally as a sign (maximum once, e.g: 2--2 is valid: two minus negative two).
- Validation in place to prevent double period per operand, starting with period is allowed (.5 for 0.5), not trailing (event blocked no user facing message needed).
- Parentheses allowed and validated for proper closed and non overlapping expression. parentheses are special characters that can alter precedence, but are not considered operators.
- Incomplete expressions (e.g: 3*) are validated live and show an error at footer.


Behaviors:
- Operator precedence: 
```
    From highest to lowest:
    1. parentheses
    2. unary minus, right-associative
    3. * and /, left-associative
    4. + and -, left-associative

    Examples:
    - 8/2*4 = 16
    - 2+3*4 = 14
    - -(2+3) = -5
    - 2*-3 = -6
    - --3: reject, or 3 if you allow repeated signs
    - 2(3): reject (no implicit multiplication)
```
- Rounding:
```
    - Inside the calculation: 34 significant digits (decimal.DivisionPrecision = 34). Only division can produce endless decimals.
    - Once, at the end: round to 16 decimal places, half away from zero (Round).
    - Output: strip trailing zeros and return a string in JSON.

    Proof cases:
    - 1/3 = 0.3333333333333333
    - 2/3 = 0.6666666666666667
    - 0.1+0.2 = 0.3
    - 1/3*3 = 1
```
- Division by zero shows "undefined"
- Equals button enabled only if all of the above are valid. show an error (footer) to the user specifying which rule was broken. Pressing it replaces input.
-To prevent losing precision on a subsequent calculation, this is, reusing the previous result and chaining more operators and operands:
Backend /calculate also returns the internal value, still as a string:
{ "result": "0.3333333333333333", "exact": "0.3333333333333333333333333333333333" }
Frontend should, after =, store { display, exact }. When = is pressed again and the input still starts with the untouched display, send exact + rest instead of what's on screen. If you edit the result digits or press clear, that stored value is dropped.

API contract:

- POST /api/v1/calculate       # evaluates the expression. receives {"expression": "4+5"}
    - 200 { "result": value, "exact": "full-value" }
    - 200 { "result": "undefined" }
    - 400 { "errors": ["Error"] } // list of detectable errors
- POST  /api/v1/validate      # validates the expression based on the rules explained above. receives {"expression": "4+5"}
    - 200 { "result": "Ok" }
    - 400 { "errors": ["Error"] }  // list of detectable errors

Other failure cases:
- Frontend checks healthz regularly to seeif backend is down. If healtz fails or any endpoint times out: calculator input and buttons get disabled until healthz returns 200. error message below with "Service unavailable momentarily".

Coder notes:
- Tests for all base combinations should be made, border cases
- Use shopspring/decimal for precision
- Updates docs/openapi.yaml
- add a versioned coverage report jsut for assignment purposes.
- gitignore node-modules and any other file when appropriate.