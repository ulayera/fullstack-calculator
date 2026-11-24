export const UNDEFINED = 'undefined'

export type Edit = { value: string; caret: number }

const ALLOWED = /^[0-9.+\-*/()]+$/
const DIGIT = /^[0-9]$/
const BINARY_NON_MINUS = new Set(['+', '*', '/'])

export const countViolations = (value: string): number => {
  let count = 0
  let expectsOperand = true
  let previousWasSign = false
  let periods = 0
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (DIGIT.test(ch)) {
      expectsOperand = false
      previousWasSign = false
      continue
    }
    if (ch === '.') {
      periods += 1
      if (periods > 1) count += 1
      if (i + 1 < value.length && !DIGIT.test(value[i + 1])) count += 1
      expectsOperand = false
      previousWasSign = false
      continue
    }
    periods = 0
    if (ch === '-') {
      if (expectsOperand && previousWasSign) count += 1
      previousWasSign = expectsOperand
      expectsOperand = true
      continue
    }
    previousWasSign = false
    if (BINARY_NON_MINUS.has(ch)) {
      if (expectsOperand) count += 1
      expectsOperand = true
    } else if (ch === '(') {
      expectsOperand = true
    } else if (ch === ')') {
      expectsOperand = false
    } else {
      count += 1
    }
  }
  return count
}

export const insert = (value: string, start: number, end: number, text: string): Edit | null => {
  const [base, from, to] = value === UNDEFINED ? ['', 0, 0] : [value, start, end]
  const next = base.slice(0, from) + text + base.slice(to)
  if (!ALLOWED.test(text) || countViolations(next) > countViolations(base)) return null
  return { value: next, caret: from + text.length }
}

export const change = (previous: string, next: string): Edit | null => {
  const shortest = Math.min(previous.length, next.length)
  let prefix = 0
  while (prefix < shortest && previous[prefix] === next[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < shortest - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  )
    suffix += 1
  const inserted = next.slice(prefix, next.length - suffix)
  if (inserted === '') {
    return previous === UNDEFINED ? { value: '', caret: 0 } : { value: next, caret: prefix }
  }
  return insert(previous, prefix, previous.length - suffix, inserted)
}
