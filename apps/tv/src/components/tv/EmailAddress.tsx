interface EmailAddressProps {
  email: string | null | undefined
}

/**
 * Email address display with icon.
 */
export function EmailAddress({ email }: EmailAddressProps) {
  if (!email) return null

  return (
    <p className="flex items-center gap-2">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span>{email}</span>
    </p>
  )
}
