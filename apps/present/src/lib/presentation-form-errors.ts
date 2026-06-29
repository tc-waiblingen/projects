export type PresentationFormErrorCode =
  | 'missing-title'
  | 'invalid-title'
  | 'invalid-code'
  | 'short-password'
  | 'code-unavailable'

const FORM_ERROR_MESSAGES: Record<PresentationFormErrorCode, string> = {
  'missing-title': 'Title is required.',
  'invalid-title': 'Title must be at least 3 characters.',
  'invalid-code': 'Presentation code must look like WAI-0426.',
  'short-password': 'Viewer password must be empty or at least 4 characters.',
  'code-unavailable': 'Could not reserve a unique presentation code. Choose a different code.',
}

export function presentationFormErrorMessage(code: string | undefined): string | null {
  return isPresentationFormErrorCode(code) ? FORM_ERROR_MESSAGES[code] : null
}

export function presentationFormErrorCode(error: unknown): PresentationFormErrorCode | null {
  if (!(error instanceof Error)) return null
  if (/^title is required$/i.test(error.message)) return 'missing-title'
  if (/^Title must be at least 3 characters$/.test(error.message)) return 'invalid-title'
  if (/^Presentation code must look like/.test(error.message)) return 'invalid-code'
  if (/^Viewer password must be at least 4 characters$/.test(error.message)) return 'short-password'
  if (/^Unable to reserve a unique presentation code$/.test(error.message)) return 'code-unavailable'
  return null
}

function isPresentationFormErrorCode(code: string | undefined): code is PresentationFormErrorCode {
  return Boolean(code && code in FORM_ERROR_MESSAGES)
}
