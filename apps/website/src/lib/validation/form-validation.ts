import { z } from 'zod'
import type { Form, FormField } from '@/types/directus-schema'

// DoS protection limits
export const LIMITS = {
  MAX_PAYLOAD_SIZE: 1024 * 1024, // 1MB
  MAX_FIELD_COUNT: 50,
  MAX_VALUE_LENGTH: 10000,
  MAX_FIELD_NAME_LENGTH: 100,
}

// Request body schema
export const formSubmissionSchema = z.object({
  formId: z.string().min(1).max(100),
  data: z.record(
    z.string().max(LIMITS.MAX_FIELD_NAME_LENGTH),
    z.union([
      z.string().max(LIMITS.MAX_VALUE_LENGTH),
      z.array(z.string().max(LIMITS.MAX_VALUE_LENGTH)),
    ])
  ).refine(
    (data) => Object.keys(data).length <= LIMITS.MAX_FIELD_COUNT,
    { message: `Maximal ${LIMITS.MAX_FIELD_COUNT} Felder erlaubt` }
  ),
})

export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>

export interface FieldValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: FieldValidationError[]
}

interface ParsedRule {
  name: string
  param?: string
}

// Parse validation rules like "email|max:255" into structured format
function parseValidationRules(validation: string | null | undefined): ParsedRule[] {
  if (!validation) return []

  return validation.split('|').map((rule) => {
    const parts = rule.split(':')
    const name = parts[0] ?? ''
    const param = parts[1]
    return { name: name.trim(), param: param?.trim() }
  })
}

// German error messages
const ERROR_MESSAGES = {
  required: (label: string) => `${label} ist ein Pflichtfeld`,
  email: (label: string) => `${label} muss eine gültige E-Mail-Adresse sein`,
  url: (label: string) => `${label} muss eine gültige URL sein`,
  min: (label: string, min: string) => `${label} muss mindestens ${min} Zeichen haben`,
  max: (label: string, max: string) => `${label} darf maximal ${max} Zeichen haben`,
  length: (label: string, length: string) => `${label} muss genau ${length} Zeichen haben`,
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// URL validation regex
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

// Validate a single field value against its rules
function validateField(
  fieldName: string,
  value: string | string[] | undefined,
  field: FormField
): FieldValidationError | null {
  const label = field.label || field.name || fieldName
  const stringValue = Array.isArray(value) ? value.join(', ') : (value ?? '')
  const isEmpty = stringValue.trim() === ''

  // Check required
  if (field.required && isEmpty) {
    return { field: fieldName, message: ERROR_MESSAGES.required(label) }
  }

  // Skip validation for empty non-required fields
  if (isEmpty) {
    return null
  }

  // Parse and apply validation rules
  const rules = parseValidationRules(field.validation)

  for (const rule of rules) {
    switch (rule.name) {
      case 'email':
        if (!EMAIL_REGEX.test(stringValue)) {
          return { field: fieldName, message: ERROR_MESSAGES.email(label) }
        }
        break

      case 'url':
        if (!URL_REGEX.test(stringValue)) {
          return { field: fieldName, message: ERROR_MESSAGES.url(label) }
        }
        break

      case 'min':
        if (rule.param && stringValue.length < parseInt(rule.param, 10)) {
          return { field: fieldName, message: ERROR_MESSAGES.min(label, rule.param) }
        }
        break

      case 'max':
        if (rule.param && stringValue.length > parseInt(rule.param, 10)) {
          return { field: fieldName, message: ERROR_MESSAGES.max(label, rule.param) }
        }
        break

      case 'length':
        if (rule.param && stringValue.length !== parseInt(rule.param, 10)) {
          return { field: fieldName, message: ERROR_MESSAGES.length(label, rule.param) }
        }
        break
    }
  }

  return null
}

// Validate all submitted fields against form definition
export function validateFormSubmission(
  data: Record<string, string | string[]>,
  form: Form
): ValidationResult {
  const errors: FieldValidationError[] = []

  // Build a map of field definitions by name
  const fieldMap = new Map<string, FormField>()
  if (form.fields) {
    for (const field of form.fields) {
      if (typeof field !== 'string' && field.name) {
        fieldMap.set(field.name, field)
      }
    }
  }

  // Validate each defined field (including checking required fields not in data)
  for (const [fieldName, field] of fieldMap) {
    const value = data[fieldName]
    const error = validateField(fieldName, value, field)
    if (error) {
      errors.push(error)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
