"use client"

import { useState, type FormEvent } from "react"
import { clsx } from "clsx/lite"
import type { BlockForm as BlockFormType, Form, FormField } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { Button } from "@/components/elements/button"

interface BlockFormProps {
  data: BlockFormType
}

export function BlockForm({ data }: BlockFormProps) {
  const { id, headline, tagline, form } = data

  if (!form || typeof form === "string") {
    return null
  }

  return (
    <Section
      eyebrow={tagline}
      headline={headline}
      editAttr={{ collection: 'block_form', item: String(id) }}
    >
      <FormContent form={form} />
    </Section>
  )
}

interface FieldError {
  field: string
  message: string
}

function FormContent({ form }: { form: Form }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { id, fields, submit_label, success_message, on_success, success_redirect_url } = form

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const data: Record<string, string | string[]> = {}

    formData.forEach((value, key) => {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          (data[key] as string[]).push(value.toString())
        } else {
          data[key] = [data[key] as string, value.toString()]
        }
      } else {
        data[key] = value.toString()
      }
    })

    try {
      const response = await fetch("/api/forms/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: id,
          data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.code === "FIELD_VALIDATION_ERROR" && result.errors) {
          const errors: Record<string, string> = {}
          for (const err of result.errors as FieldError[]) {
            errors[err.field] = err.message
          }
          setFieldErrors(errors)
        }
        throw new Error(result.error || "Form submission failed")
      }

      if (on_success === "redirect" && success_redirect_url) {
        window.location.href = success_redirect_url
        return
      }

      setSubmitResult({
        success: true,
        message: success_message ?? "Vielen Dank für Ihre Nachricht!",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      setSubmitResult({
        success: false,
        message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitResult?.success) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-green-800 dark:bg-green-900/20 dark:text-green-200">
        {submitResult.message}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="flex flex-wrap gap-4">
        {fields &&
          fields.map((field) => {
            if (typeof field === "string") {
              return null
            }
            return (
              <FormFieldComponent
                key={field.id}
                field={field}
                error={field.name ? fieldErrors[field.name] : undefined}
                onClearError={field.name ? () => clearFieldError(field.name!) : undefined}
              />
            )
          })}
      </div>

      {submitResult && !submitResult.success && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {submitResult.message}
        </div>
      )}

      <div className="mt-6">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Wird gesendet..." : (submit_label ?? "Absenden")}
        </Button>
      </div>
    </form>
  )
}

interface FormFieldComponentProps {
  field: FormField
  error?: string
  onClearError?: () => void
}

function FormFieldComponent({ field, error, onClearError }: FormFieldComponentProps) {
  const { name, type, label, placeholder, help, required, width, choices } = field

  const widthClass = getWidthClass(width)

  const baseInputClasses =
    "w-full rounded-lg border bg-white px-4 py-2 text-tcw-accent-900 placeholder:text-tcw-accent-500 focus:outline-none focus:ring-1 dark:bg-tcw-accent-900 dark:text-white dark:placeholder:text-tcw-accent-400"

  const inputClasses = clsx(
    baseInputClasses,
    error
      ? "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500"
      : "border-tcw-accent-300 focus:border-tcw-accent-500 focus:ring-tcw-accent-500 dark:border-tcw-accent-700"
  )

  const labelClasses = "block text-sm font-medium text-tcw-accent-900 dark:text-white"

  const handleChange = () => {
    if (onClearError) {
      onClearError()
    }
  }

  if (type === "hidden") {
    return <input type="hidden" name={name ?? ""} />
  }

  return (
    <div className={clsx("flex flex-col gap-1", widthClass)}>
      {label && (
        <label htmlFor={name ?? ""} className={labelClasses}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          id={name ?? ""}
          name={name ?? ""}
          placeholder={placeholder ?? ""}
          required={required ?? false}
          rows={4}
          className={inputClasses}
          onChange={handleChange}
        />
      ) : type === "select" ? (
        <select
          id={name ?? ""}
          name={name ?? ""}
          required={required ?? false}
          className={inputClasses}
          onChange={handleChange}
        >
          <option value="">{placeholder ?? "Bitte wählen..."}</option>
          {choices &&
            choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.text}
              </option>
            ))}
        </select>
      ) : type === "checkbox" ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={name ?? ""}
            name={name ?? ""}
            required={required ?? false}
            className={clsx(
              "h-4 w-4 rounded focus:ring-tcw-accent-500",
              error
                ? "border-red-500 text-red-500 dark:border-red-500"
                : "border-tcw-accent-300 text-tcw-accent-900 dark:border-tcw-accent-700"
            )}
            onChange={handleChange}
          />
          {label && (
            <label htmlFor={name ?? ""} className="text-sm text-tcw-accent-700 dark:text-tcw-accent-300">
              {label}
            </label>
          )}
        </div>
      ) : type === "checkbox_group" ? (
        <div className="flex flex-col gap-2">
          {choices &&
            choices.map((choice) => (
              <div key={choice.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`${name}-${choice.value}`}
                  name={name ?? ""}
                  value={choice.value}
                  className={clsx(
                    "h-4 w-4 rounded focus:ring-tcw-accent-500",
                    error
                      ? "border-red-500 text-red-500 dark:border-red-500"
                      : "border-tcw-accent-300 text-tcw-accent-900 dark:border-tcw-accent-700"
                  )}
                  onChange={handleChange}
                />
                <label
                  htmlFor={`${name}-${choice.value}`}
                  className="text-sm text-tcw-accent-700 dark:text-tcw-accent-300"
                >
                  {choice.text}
                </label>
              </div>
            ))}
        </div>
      ) : type === "radio" ? (
        <div className="flex flex-col gap-2">
          {choices &&
            choices.map((choice) => (
              <div key={choice.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`${name}-${choice.value}`}
                  name={name ?? ""}
                  value={choice.value}
                  required={required ?? false}
                  className={clsx(
                    "h-4 w-4 focus:ring-tcw-accent-500",
                    error
                      ? "border-red-500 text-red-500 dark:border-red-500"
                      : "border-tcw-accent-300 text-tcw-accent-900 dark:border-tcw-accent-700"
                  )}
                  onChange={handleChange}
                />
                <label
                  htmlFor={`${name}-${choice.value}`}
                  className="text-sm text-tcw-accent-700 dark:text-tcw-accent-300"
                >
                  {choice.text}
                </label>
              </div>
            ))}
        </div>
      ) : (
        <input
          type={type === "text" ? "text" : type ?? "text"}
          id={name ?? ""}
          name={name ?? ""}
          placeholder={placeholder ?? ""}
          required={required ?? false}
          className={inputClasses}
          onChange={handleChange}
        />
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {help && !error && (
        <p className="text-xs text-tcw-accent-600 dark:text-tcw-accent-400">{help}</p>
      )}
    </div>
  )
}

function getWidthClass(width: FormField["width"]): string {
  switch (width) {
    case "33":
      return "w-full sm:w-[calc(33.333%-0.667rem)]"
    case "50":
      return "w-full sm:w-[calc(50%-0.5rem)]"
    case "67":
      return "w-full sm:w-[calc(66.666%-0.333rem)]"
    case "100":
    default:
      return "w-full"
  }
}
