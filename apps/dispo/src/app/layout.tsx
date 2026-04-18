import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TCW-Platzzuweisung',
  description: 'Platzbelegung-Verwaltung für TC Waiblingen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans text-body antialiased">{children}</body>
    </html>
  )
}
