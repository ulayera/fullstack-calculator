import { describe, expect, it } from 'vitest'
import { change, countViolations, insert, normalize } from './input'

const typed = (keys: string) =>
  [...keys].reduce((value, key) => insert(value, value.length, value.length, key)?.value ?? value, '')

describe('countViolations', () => {
  it.each([
    '',
    '4+5',
    '2--2',
    '2*-3',
    '-(2+3)',
    '.5+.5',
    '(1.5)*2',
    '5.',
    '2+)',
    '2(3)',
    '((',
    '-',
    '2^3',
    '2^-1',
    '20%300',
    '10%-5',
    '√4',
    '√-4',
    '-√4',
    '√√16',
    '2^√4',
    '√(2+2)',
    '2√4',
    '√',
  ])('finds none in %j', (value) => {
    expect(countViolations(value)).toBe(0)
  })

  it.each([
    ['*3', 1],
    ['(+3)', 1],
    ['2++3', 1],
    ['2*/3', 1],
    ['--3', 1],
    ['2---3', 1],
    ['1.2.3', 1],
    ['5.+2', 1],
    ['5.)', 1],
    ['5.(', 1],
    ['1..2', 2],
    ['2a', 1],
    ['undefined', 9],
    ['2 +3', 1],
    ['^2', 1],
    ['%2', 1],
    ['2^^3', 1],
    ['2%%3', 1],
    ['2%*3', 1],
    ['2*^3', 1],
    ['√*4', 1],
    ['√%4', 1],
    ['(^2)', 1],
    ['2^--3', 1],
    ['√--4', 1],
    ['5.√', 1],
    ['V4', 1],
  ])('counts %j as %i', (value, expected) => {
    expect(countViolations(value)).toBe(expected)
  })
})

describe('insert', () => {
  it('inserts at the caret and moves the caret after the text', () => {
    expect(insert('12', 1, 1, '+')).toEqual({ value: '1+2', caret: 2 })
  })

  it('replaces the selected range', () => {
    expect(insert('1+2', 1, 2, '*')).toEqual({ value: '1*2', caret: 2 })
  })

  it.each(['a', ' ', 'e', '=', ',', '&', '!', 'x', ''])('blocks the disallowed text %j', (text) => {
    expect(insert('1', 1, 1, text)).toBeNull()
  })

  it.each([
    ['2+*', '2+'],
    ['2*/', '2*'],
    ['*', ''],
    ['+5', '5'],
    ['(*', '('],
    ['--3', '-3'],
    ['2---3', '2--3'],
    ['1.2.3', '1.23'],
    ['5.+2', '5.2'],
    ['5.)', '5.'],
    ['5..', '5.'],
    ['V4', '√4'],
    ['v4', '√4'],
    ['2^^3', '2^3'],
    ['2%%3', '2%3'],
    ['2^*3', '2^3'],
    ['^2', '2'],
    ['%2', '2'],
    ['√*4', '√4'],
    ['2^--3', '2^-3'],
    ['5.√', '5.'],
    ['2*V(3^2)', '2*√(3^2)'],
  ])('typing %j yields %j', (keys, expected) => {
    expect(typed(keys)).toBe(expected)
  })

  it.each(['2--2', '2*-3', '-(2+3)', '.5', '0.25/(3-1.5)', '(-3)', '2+)', '2^3^2', '-2^2', '2^-1', '√4*4', '√16^0.5', '10%200', '5+10%50', '100/10%50', '10%2^3', '√-4', '√√16'])(
    'lets %j through unchanged',
    (keys) => {
      expect(typed(keys)).toBe(keys)
    },
  )

  it('blocks a period inserted before an operator', () => {
    expect(insert('5+2', 1, 1, '.')).toBeNull()
  })

  it('blocks a second period inserted into the same operand', () => {
    expect(insert('1.25', 3, 3, '.')).toBeNull()
  })

  it('allows insertions elsewhere while an earlier violation remains', () => {
    expect(insert('*5', 2, 2, '+')).toEqual({ value: '*5+', caret: 3 })
  })

  it('starts fresh when the value is undefined', () => {
    expect(insert('undefined', 9, 9, '7')).toEqual({ value: '7', caret: 1 })
    expect(insert('undefined', 0, 9, '-')).toEqual({ value: '-', caret: 1 })
    expect(insert('undefined', 9, 9, '*')).toBeNull()
    expect(insert('undefined', 9, 9, ')')).toBeNull()
    expect(insert('undefined', 9, 9, '+')).toBeNull()
    expect(insert('undefined', 9, 9, '.')).toEqual({ value: '.', caret: 1 })
    expect(insert('undefined', 9, 9, '(')).toEqual({ value: '(', caret: 1 })
    expect(insert('undefined', 9, 9, '√')).toEqual({ value: '√', caret: 1 })
    expect(insert('undefined', 9, 9, 'V')).toEqual({ value: '√', caret: 1 })
    expect(insert('undefined', 9, 9, '^')).toBeNull()
    expect(insert('undefined', 9, 9, '%')).toBeNull()
  })

  it('converts V to √ in inserted text, including multi-character text', () => {
    expect(insert('2*', 2, 2, 'V9')).toEqual({ value: '2*√9', caret: 4 })
  })
})

describe('normalize', () => {
  it('turns every V and v into √ and leaves the rest alone', () => {
    expect(normalize('V4+v9-√1')).toBe('√4+√9-√1')
  })
})

describe('change', () => {
  it('accepts a deletion and places the caret where it happened', () => {
    expect(change('12+3', '123')).toEqual({ value: '123', caret: 2 })
  })

  it('accepts a deletion that leaves a violation behind', () => {
    expect(change('2*3', '*3')).toEqual({ value: '*3', caret: 0 })
  })

  it('clears an undefined result on any deletion', () => {
    expect(change('undefined', 'undefine')).toEqual({ value: '', caret: 0 })
  })

  it('routes insertions through the insert rules', () => {
    expect(change('2+', '2+3')).toEqual({ value: '2+3', caret: 3 })
    expect(change('2+', '2+*')).toBeNull()
    expect(change('22', '2a2')).toBeNull()
  })

  it('treats a replaced selection as an insertion over that range', () => {
    expect(change('123', 'a')).toBeNull()
    expect(change('1+3', '1*3')).toEqual({ value: '1*3', caret: 2 })
  })

  it('handles repeated characters around the edit', () => {
    expect(change('11', '111')).toEqual({ value: '111', caret: 3 })
    expect(change('111', '11')).toEqual({ value: '11', caret: 2 })
  })

  it('converts a typed V to √', () => {
    expect(change('2*', '2*V')).toEqual({ value: '2*√', caret: 3 })
  })

  it('starts fresh when typing over an undefined result', () => {
    expect(change('undefined', 'undefined4')).toEqual({ value: '4', caret: 1 })
  })
})
