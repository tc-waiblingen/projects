import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { getDirectus } from "@/lib/directus/directus"
import { fetchFormById } from "@/lib/directus/fetchers"
import {
  formSubmissionSchema,
  validateFormSubmission,
  LIMITS,
} from "@/lib/validation/form-validation"

export async function POST(request: NextRequest) {
  // Check Content-Length for early DoS rejection
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > LIMITS.MAX_PAYLOAD_SIZE) {
    return NextResponse.json(
      { error: "Anfrage zu groß", code: "PAYLOAD_TOO_LARGE" },
      { status: 413 }
    )
  }

  // Parse JSON with error handling
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON-Format", code: "INVALID_JSON" },
      { status: 400 }
    )
  }

  // Validate request structure with Zod
  let body
  try {
    body = formSubmissionSchema.parse(rawBody)
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError
      return NextResponse.json(
        {
          error: "Ungültiges Anfrageformat",
          code: "VALIDATION_ERROR",
          details: zodError.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Validierungsfehler", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const { formId, data } = body

  // Fetch form definition from Directus
  const form = await fetchFormById(formId)

  if (!form) {
    return NextResponse.json(
      { error: "Formular nicht gefunden", code: "FORM_NOT_FOUND" },
      { status: 404 }
    )
  }

  // Check if form is active
  if (form.is_active === false) {
    return NextResponse.json(
      { error: "Formular nicht verfügbar", code: "FORM_INACTIVE" },
      { status: 400 }
    )
  }

  // Validate submitted data against form field definitions
  const validationResult = validateFormSubmission(data, form)

  if (!validationResult.valid) {
    return NextResponse.json(
      {
        error: "Validierung fehlgeschlagen",
        code: "FIELD_VALIDATION_ERROR",
        errors: validationResult.errors,
      },
      { status: 400 }
    )
  }

  // Create the form submission in Directus
  try {
    const { directus, createItem } = getDirectus()

    const submission = await directus.request(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createItem("form_submissions" as any, {
        form: formId,
        timestamp: new Date().toISOString(),
        values: {
          create: Object.entries(data).map(([fieldName, value]) => ({
            field: fieldName,
            value: Array.isArray(value) ? value.join(", ") : value,
            timestamp: new Date().toISOString(),
          })),
          update: [],
          delete: [],
        },
      })
    )

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error("Form submission error:", error)
    return NextResponse.json(
      { error: "Formular konnte nicht gesendet werden", code: "SUBMISSION_FAILED" },
      { status: 500 }
    )
  }
}
