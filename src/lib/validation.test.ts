import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLeadPayload } from './validation.ts';

describe('validation', () => {
  test('valid payload returns no errors', () => {
    const data = {
      name: 'John Doe',
      email: 'john@company.com',
      company: 'Acme Corp',
      role: 'CEO',
      q1: 'amazon',
      q2: 'under5',
      q3: 'somewhat',
      linkedin: 'https://www.linkedin.com/in/johndoe'
    };
    assert.deepEqual(validateLeadPayload(data), []);
  });

  test('missing required fields return errors', () => {
    const data = {};
    const errors = validateLeadPayload(data);
    assert.ok(errors.includes('"name" is required.'));
    assert.ok(errors.includes('"email" is required.'));
    assert.ok(errors.includes('"company" is required.'));
    assert.ok(errors.includes('"role" is required.'));
  });

  test('generic email requires linkedin', () => {
    const data = {
      name: 'John Doe',
      email: 'john@gmail.com',
      company: 'Acme Corp',
      role: 'CEO',
    };
    const errors = validateLeadPayload(data);
    assert.ok(errors.includes('"linkedin" is required for generic email providers.'));
  });

  test('invalid email format', () => {
    const data = {
      name: 'John Doe',
      email: 'johngmail.com',
      company: 'Acme Corp',
      role: 'CEO',
    };
    const errors = validateLeadPayload(data);
    assert.ok(errors.includes('"email" must be a valid email address.'));
  });

  test('invalid enum values', () => {
    const data = {
      name: 'John Doe',
      email: 'john@company.com',
      company: 'Acme Corp',
      role: 'CEO',
      q1: 'invalid',
    };
    const errors = validateLeadPayload(data);
    assert.ok(errors.includes('"q1" must be one of: amazon, walmart, both, other.'));
  });
});
