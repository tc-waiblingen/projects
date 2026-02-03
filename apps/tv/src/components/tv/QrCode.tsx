import clsx from 'clsx'

interface QrCodeProps {
  linkUrl: string
  qrCodeDataUrl: string
  label?: string
  size?: 'small' | 'large'
}

/**
 * QR Code component that displays a clickable QR code with optional label.
 */
export function QrCode({ linkUrl, qrCodeDataUrl, label, size = 'small' }: QrCodeProps) {
  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 transition-opacity hover:opacity-70"
    >
      <img
        src={qrCodeDataUrl}
        alt={label || 'QR Code'}
        className={clsx('rounded-md border-2 border-white/70 bg-white', size === 'large' ? 'h-16 w-16' : 'h-12 w-12')}
      />
      {label && (
        <span className={clsx('font-medium', size === 'large' ? 'text-xs text-neutral-500' : 'text-[9px] text-neutral-500')}>
          {label}
        </span>
      )}
    </a>
  )
}
