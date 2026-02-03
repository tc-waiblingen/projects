/**
 * QR code generation utilities.
 */

import QRCode from 'qrcode'

interface QrCodeOptions {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Generate a QR code as a data URL.
 * @param url - The URL to encode
 * @param options - QR code options
 * @returns QR code as data URL or null on error
 */
export async function generateQrCode(url: string, options: QrCodeOptions = {}): Promise<string | null> {
  if (!url) {
    return null
  }

  const defaults: QrCodeOptions = { width: 96, margin: 0 }

  try {
    return await QRCode.toDataURL(url, { ...defaults, ...options })
  } catch (error) {
    console.warn('[QRCode] Failed to generate QR code:', (error as Error).message)
    return null
  }
}

/**
 * Generate a QR code with transparent background as a data URL.
 * @param url - The URL to encode
 * @param options - QR code options
 * @returns QR code as data URL or null on error
 */
export async function generateTransparentQrCode(url: string, options: QrCodeOptions = {}): Promise<string | null> {
  return generateQrCode(url, {
    width: 96,
    margin: 1,
    ...options,
    color: { dark: '#000000', light: '#00000000' },
  })
}

/**
 * Helper function to generate QR codes for use in views.
 * @param url - URL to encode
 * @param size - Size of the QR code (small=80px, large=96px)
 * @param transparent - Whether to use transparent background
 * @returns QR code data URL
 */
export async function generateQrCodeForView(
  url: string,
  size: 'small' | 'large' = 'small',
  transparent = false
): Promise<string | null> {
  if (!url) {
    return null
  }

  const qrOptions: QrCodeOptions = {
    width: size === 'large' ? 96 : 80,
    margin: size === 'large' ? 0 : 1,
  }

  return transparent ? await generateTransparentQrCode(url, qrOptions) : await generateQrCode(url, qrOptions)
}
