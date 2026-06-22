import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TCW Present',
  description: 'Screen sharing for TC Waiblingen presentations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans text-body antialiased">{children}</body>
    </html>
  )
}
