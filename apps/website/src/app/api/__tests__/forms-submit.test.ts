import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../forms/submit/route'
import { LIMITS } from '@/lib/validation/form-validation'

// Mock the Directus modules
vi.mock('@/lib/directus/fetchers', () => ({
  fetchFormById: vi.fn(),
}))

vi.mock('@/lib/directus/directus', () => ({
  getDirectus: vi.fn(() => ({
    directus: {
      request: vi.fn(),
    },
    createItem: vi.fn(() => ({})),
  })),
}))

import { fetchFormById } from '@/lib/directus/fetchers'
import { getDirectus } from '@/lib/directus/directus'

describe('POST /api/forms/submit', () => {
  const mockFetchFormById = vi.mocked(fetchFormById)
  const mockGetDirectus = vi.mocked(getDirectus)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('DoS protection', () => {
    it('rejects payload larger than MAX_PAYLOAD_SIZE', async () => {
      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Length': String(LIMITS.MAX_PAYLOAD_SIZE + 1),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formId: 'test', data: {} }),
      })

      const response = await POST(request)

      expect(response.status).toBe(413)
      const body = await response.json()
      expect(body.code).toBe('PAYLOAD_TOO_LARGE')
    })
  })

  describe('JSON parsing', () => {
    it('rejects invalid JSON', async () => {
      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('INVALID_JSON')
    })
  })

  describe('Zod schema validation', () => {
    it('rejects missing formId', async () => {
      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { name: 'John' } }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects empty formId', async () => {
      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: '', data: {} }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects too many fields', async () => {
      const data: Record<string, string> = {}
      for (let i = 0; i < LIMITS.MAX_FIELD_COUNT + 1; i++) {
        data[`field${i}`] = 'value'
      }

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: 'test', data }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('returns validation error details', async () => {
      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: 123, data: 'not-an-object' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.details).toBeDefined()
      expect(Array.isArray(body.details)).toBe(true)
    })
  })

  describe('Form lookup', () => {
    it('returns 404 when form not found', async () => {
      mockFetchFormById.mockResolvedValue(null)

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: 'nonexistent', data: {} }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.code).toBe('FORM_NOT_FOUND')
    })

    it('returns 400 when form is inactive', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'test-form',
        is_active: false,
        fields: [],
      })

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: 'test-form', data: {} }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('FORM_INACTIVE')
    })
  })

  describe('Field validation', () => {
    it('returns field validation errors', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'test-form',
        is_active: true,
        fields: [
          { id: '1', name: 'email', label: 'E-Mail', required: true, validation: 'email' },
        ],
      })

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'test-form',
          data: { email: 'not-an-email' },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('FIELD_VALIDATION_ERROR')
      expect(body.errors).toBeDefined()
      expect(body.errors[0].field).toBe('email')
    })

    it('returns error for missing required field', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'test-form',
        is_active: true,
        fields: [
          { id: '1', name: 'name', label: 'Name', required: true },
        ],
      })

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'test-form',
          data: {},
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('FIELD_VALIDATION_ERROR')
      expect(body.errors[0].field).toBe('name')
    })
  })

  describe('Successful submission', () => {
    it('creates submission and returns success', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'contact-form',
        is_active: true,
        fields: [
          { id: '1', name: 'name', label: 'Name', required: true },
          { id: '2', name: 'email', label: 'E-Mail', required: true, validation: 'email' },
        ],
      })

      const mockDirectusRequest = vi.fn().mockResolvedValue({ id: 'submission-123' })
      mockGetDirectus.mockReturnValue({
        directus: { request: mockDirectusRequest },
        createItem: vi.fn(() => ({})),
      } as ReturnType<typeof getDirectus>)

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'contact-form',
          data: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.submission).toBeDefined()
    })

    it('handles array values', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'survey-form',
        is_active: true,
        fields: [
          { id: '1', name: 'interests', label: 'Interests', required: false },
        ],
      })

      const mockDirectusRequest = vi.fn().mockResolvedValue({ id: 'submission-456' })
      mockGetDirectus.mockReturnValue({
        directus: { request: mockDirectusRequest },
        createItem: vi.fn(() => ({})),
      } as ReturnType<typeof getDirectus>)

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'survey-form',
          data: {
            interests: ['tennis', 'swimming'],
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Submission error handling', () => {
    it('returns 500 on Directus error', async () => {
      mockFetchFormById.mockResolvedValue({
        id: 'test-form',
        is_active: true,
        fields: [],
      })

      const mockDirectusRequest = vi.fn().mockRejectedValue(new Error('Database error'))
      mockGetDirectus.mockReturnValue({
        directus: { request: mockDirectusRequest },
        createItem: vi.fn(() => ({})),
      } as ReturnType<typeof getDirectus>)

      const request = new NextRequest('https://localhost/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'test-form',
          data: {},
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.code).toBe('SUBMISSION_FAILED')
    })
  })
})
