import { describe, expect, it } from 'vitest'
import { formSubmissionSchema, validateFormSubmission, LIMITS } from '../form-validation'
import type { Form, FormField } from '@/types/directus-schema'

describe('form-validation', () => {
  describe('LIMITS', () => {
    it('defines sensible DoS protection limits', () => {
      expect(LIMITS.MAX_PAYLOAD_SIZE).toBe(1024 * 1024) // 1MB
      expect(LIMITS.MAX_FIELD_COUNT).toBe(50)
      expect(LIMITS.MAX_VALUE_LENGTH).toBe(10000)
      expect(LIMITS.MAX_FIELD_NAME_LENGTH).toBe(100)
    })
  })

  describe('formSubmissionSchema', () => {
    it('accepts valid submission', () => {
      const input = {
        formId: 'contact-form',
        data: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects empty formId', () => {
      const input = {
        formId: '',
        data: { name: 'John' },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects formId over 100 characters', () => {
      const input = {
        formId: 'a'.repeat(101),
        data: { name: 'John' },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts array values', () => {
      const input = {
        formId: 'form',
        data: {
          interests: ['tennis', 'swimming'],
        },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects field values over 10000 characters', () => {
      const input = {
        formId: 'form',
        data: {
          message: 'a'.repeat(10001),
        },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects field names over 100 characters', () => {
      const input = {
        formId: 'form',
        data: {
          ['a'.repeat(101)]: 'value',
        },
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects more than 50 fields', () => {
      const data: Record<string, string> = {}
      for (let i = 0; i < 51; i++) {
        data[`field${i}`] = 'value'
      }
      const input = {
        formId: 'form',
        data,
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts exactly 50 fields', () => {
      const data: Record<string, string> = {}
      for (let i = 0; i < 50; i++) {
        data[`field${i}`] = 'value'
      }
      const input = {
        formId: 'form',
        data,
      }
      const result = formSubmissionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('validateFormSubmission', () => {
    const createForm = (fields: Partial<FormField>[]): Form => ({
      id: 'test-form',
      status: 'published',
      name: 'Test Form',
      fields: fields.map((f, i) => ({
        id: `field-${i}`,
        name: f.name ?? `field${i}`,
        label: f.label ?? null,
        type: f.type ?? 'input',
        required: f.required ?? false,
        validation: f.validation ?? null,
        width: f.width ?? 'full',
        placeholder: f.placeholder ?? null,
        note: f.note ?? null,
        choices: f.choices ?? null,
      })) as FormField[],
      on_success: null,
      submit_label: null,
      success_message: null,
    })

    describe('required field validation', () => {
      it('fails when required field is missing', () => {
        const form = createForm([{ name: 'email', required: true }])
        const result = validateFormSubmission({}, form)
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]?.field).toBe('email')
      })

      it('fails when required field is empty string', () => {
        const form = createForm([{ name: 'email', required: true }])
        const result = validateFormSubmission({ email: '' }, form)
        expect(result.valid).toBe(false)
      })

      it('fails when required field is whitespace only', () => {
        const form = createForm([{ name: 'email', required: true }])
        const result = validateFormSubmission({ email: '   ' }, form)
        expect(result.valid).toBe(false)
      })

      it('passes when required field has value', () => {
        const form = createForm([{ name: 'email', required: true }])
        const result = validateFormSubmission({ email: 'test@example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('passes when non-required field is empty', () => {
        const form = createForm([{ name: 'email', required: false }])
        const result = validateFormSubmission({ email: '' }, form)
        expect(result.valid).toBe(true)
      })

      it('uses label in error message when available', () => {
        const form = createForm([{ name: 'email', label: 'E-Mail-Adresse', required: true }])
        const result = validateFormSubmission({}, form)
        expect(result.errors[0]?.message).toContain('E-Mail-Adresse')
      })

      it('falls back to field name in error message', () => {
        const form = createForm([{ name: 'email', required: true }])
        const result = validateFormSubmission({}, form)
        expect(result.errors[0]?.message).toContain('email')
      })
    })

    describe('email validation', () => {
      it('passes valid email', () => {
        const form = createForm([{ name: 'email', validation: 'email' }])
        const result = validateFormSubmission({ email: 'test@example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('passes email with subdomain', () => {
        const form = createForm([{ name: 'email', validation: 'email' }])
        const result = validateFormSubmission({ email: 'test@mail.example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('fails email without @', () => {
        const form = createForm([{ name: 'email', validation: 'email' }])
        const result = validateFormSubmission({ email: 'testexample.com' }, form)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.message).toContain('E-Mail')
      })

      it('fails email without domain', () => {
        const form = createForm([{ name: 'email', validation: 'email' }])
        const result = validateFormSubmission({ email: 'test@' }, form)
        expect(result.valid).toBe(false)
      })

      it('fails email without TLD', () => {
        const form = createForm([{ name: 'email', validation: 'email' }])
        const result = validateFormSubmission({ email: 'test@example' }, form)
        expect(result.valid).toBe(false)
      })

      it('skips validation for empty non-required email', () => {
        const form = createForm([{ name: 'email', validation: 'email', required: false }])
        const result = validateFormSubmission({ email: '' }, form)
        expect(result.valid).toBe(true)
      })
    })

    describe('URL validation', () => {
      it('passes valid https URL', () => {
        const form = createForm([{ name: 'website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'https://example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('passes valid http URL', () => {
        const form = createForm([{ name: 'website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'http://example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('passes URL with path', () => {
        const form = createForm([{ name: 'website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'https://example.com/path/to/page' }, form)
        expect(result.valid).toBe(true)
      })

      it('fails URL without protocol', () => {
        const form = createForm([{ name: 'website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'example.com' }, form)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.message).toContain('URL')
      })

      it('fails non-http URL', () => {
        const form = createForm([{ name: 'website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'ftp://example.com' }, form)
        expect(result.valid).toBe(false)
      })
    })

    describe('length validation', () => {
      it('passes min length', () => {
        const form = createForm([{ name: 'name', validation: 'min:3' }])
        const result = validateFormSubmission({ name: 'abc' }, form)
        expect(result.valid).toBe(true)
      })

      it('fails below min length', () => {
        const form = createForm([{ name: 'name', label: 'Name', validation: 'min:3' }])
        const result = validateFormSubmission({ name: 'ab' }, form)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.message).toContain('mindestens 3 Zeichen')
      })

      it('passes max length', () => {
        const form = createForm([{ name: 'name', validation: 'max:10' }])
        const result = validateFormSubmission({ name: '1234567890' }, form)
        expect(result.valid).toBe(true)
      })

      it('fails above max length', () => {
        const form = createForm([{ name: 'name', label: 'Name', validation: 'max:10' }])
        const result = validateFormSubmission({ name: '12345678901' }, form)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.message).toContain('maximal 10 Zeichen')
      })

      it('passes exact length', () => {
        const form = createForm([{ name: 'code', validation: 'length:5' }])
        const result = validateFormSubmission({ code: '12345' }, form)
        expect(result.valid).toBe(true)
      })

      it('fails wrong exact length', () => {
        const form = createForm([{ name: 'code', label: 'Code', validation: 'length:5' }])
        const result = validateFormSubmission({ code: '1234' }, form)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.message).toContain('genau 5 Zeichen')
      })
    })

    describe('combined validation rules', () => {
      it('validates email with max length', () => {
        const form = createForm([{ name: 'email', validation: 'email|max:50' }])
        const longEmail = 'a'.repeat(40) + '@example.com'
        const result = validateFormSubmission({ email: longEmail }, form)
        expect(result.valid).toBe(false) // 52 chars > 50
      })

      it('validates required email with max length', () => {
        const form = createForm([{ name: 'email', required: true, validation: 'email|max:100' }])
        const result = validateFormSubmission({ email: 'valid@example.com' }, form)
        expect(result.valid).toBe(true)
      })

      it('stops at first error for field', () => {
        const form = createForm([{ name: 'email', validation: 'email|max:5' }])
        const result = validateFormSubmission({ email: 'invalid' }, form)
        // Should fail on email first, not check max
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]?.message).toContain('E-Mail')
      })
    })

    describe('array values', () => {
      it('joins array values for validation', () => {
        const form = createForm([{ name: 'items', required: true }])
        const result = validateFormSubmission({ items: ['a', 'b'] }, form)
        expect(result.valid).toBe(true)
      })

      it('fails required when array is empty', () => {
        const form = createForm([{ name: 'items', required: true }])
        const result = validateFormSubmission({ items: [] }, form)
        // Empty array joins to empty string
        expect(result.valid).toBe(false)
      })

      it('validates joined array length', () => {
        const form = createForm([{ name: 'items', validation: 'max:5' }])
        const result = validateFormSubmission({ items: ['ab', 'cd'] }, form)
        // Joined: "ab, cd" = 6 chars > 5
        expect(result.valid).toBe(false)
      })
    })

    describe('multiple fields', () => {
      it('validates all fields', () => {
        const form = createForm([
          { name: 'name', required: true },
          { name: 'email', required: true, validation: 'email' },
        ])
        const result = validateFormSubmission({}, form)
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(2)
      })

      it('returns all field errors', () => {
        const form = createForm([
          { name: 'name', required: true },
          { name: 'email', required: true },
          { name: 'phone', required: true },
        ])
        const result = validateFormSubmission({}, form)
        expect(result.errors).toHaveLength(3)
        expect(result.errors.map((e) => e.field)).toEqual(['name', 'email', 'phone'])
      })

      it('passes when all fields valid', () => {
        const form = createForm([
          { name: 'name', required: true },
          { name: 'email', required: true, validation: 'email' },
        ])
        const result = validateFormSubmission({ name: 'John', email: 'john@example.com' }, form)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('German error messages', () => {
      it('uses German for required error', () => {
        const form = createForm([{ name: 'name', label: 'Name', required: true }])
        const result = validateFormSubmission({}, form)
        expect(result.errors[0]?.message).toBe('Name ist ein Pflichtfeld')
      })

      it('uses German for email error', () => {
        const form = createForm([{ name: 'email', label: 'E-Mail', validation: 'email' }])
        const result = validateFormSubmission({ email: 'invalid' }, form)
        expect(result.errors[0]?.message).toBe('E-Mail muss eine gültige E-Mail-Adresse sein')
      })

      it('uses German for URL error', () => {
        const form = createForm([{ name: 'website', label: 'Website', validation: 'url' }])
        const result = validateFormSubmission({ website: 'invalid' }, form)
        expect(result.errors[0]?.message).toBe('Website muss eine gültige URL sein')
      })
    })

    describe('edge cases', () => {
      it('handles form with no fields', () => {
        const form = createForm([])
        const result = validateFormSubmission({ random: 'data' }, form)
        expect(result.valid).toBe(true)
      })

      it('handles null fields array', () => {
        const form: Form = {
          id: 'test',
          status: 'published',
          name: 'Test',
          fields: null,
          on_success: null,
          submit_label: null,
          success_message: null,
        }
        const result = validateFormSubmission({ random: 'data' }, form)
        expect(result.valid).toBe(true)
      })

      it('ignores extra data not in form definition', () => {
        const form = createForm([{ name: 'name', required: true }])
        const result = validateFormSubmission({ name: 'John', extra: 'ignored' }, form)
        expect(result.valid).toBe(true)
      })

      it('handles undefined value', () => {
        const form = createForm([{ name: 'optional', required: false }])
        const result = validateFormSubmission({}, form)
        expect(result.valid).toBe(true)
      })
    })
  })
})
