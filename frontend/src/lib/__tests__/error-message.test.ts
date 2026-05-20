import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { extractErrorMessage } from '../error-message.ts'

test('extractErrorMessage returns string detail unchanged', () => {
  const err = { response: { data: { detail: 'Email already registered.' } } }
  assert.equal(extractErrorMessage(err), 'Email already registered.')
})

test('extractErrorMessage joins FastAPI Pydantic validation error array', () => {
  const err = {
    response: {
      data: {
        detail: [
          { type: 'string_too_short', loc: ['body', 'password'], msg: 'String should have at least 8 characters', input: 'abc', url: 'https://errors.pydantic.dev' },
          { type: 'value_error', loc: ['body', 'email'], msg: 'value is not a valid email address', input: 'nope', url: 'https://errors.pydantic.dev' },
        ],
      },
    },
  }
  const msg = extractErrorMessage(err)
  assert.equal(typeof msg, 'string')
  assert.match(msg, /password: String should have at least 8 characters/)
  assert.match(msg, /email: value is not a valid email address/)
})

test('extractErrorMessage falls back when shape is unknown', () => {
  assert.equal(extractErrorMessage({}, 'fallback'), 'fallback')
  assert.equal(extractErrorMessage(undefined, 'fallback'), 'fallback')
})

test('extractErrorMessage handles Error instances', () => {
  assert.equal(extractErrorMessage(new Error('boom')), 'boom')
})

test('extractErrorMessage never returns an object', () => {
  const err = { response: { data: { detail: [{ msg: 'bad', loc: ['body', 'x'] }] } } }
  const result = extractErrorMessage(err)
  assert.equal(typeof result, 'string')
})
