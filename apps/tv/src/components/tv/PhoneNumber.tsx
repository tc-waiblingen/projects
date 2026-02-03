import { formatPhoneNumber } from '@/lib/phone-number-helper'

interface PhoneNumberProps {
  phone: string | null | undefined
}

/**
 * Phone number display with icon.
 */
export function PhoneNumber({ phone }: PhoneNumberProps) {
  if (!phone) return null

  return (
    <p className="flex items-center gap-2">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <span>{formatPhoneNumber(phone)}</span>
    </p>
  )
}
