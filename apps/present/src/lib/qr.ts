import QRCode from 'qrcode'

export async function createQrDataUrl(value: string, width: number): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width,
  })
}
