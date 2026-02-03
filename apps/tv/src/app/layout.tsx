import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TCW TV',
  description: 'TV-Anzeige für Tennis-Club Waiblingen e.V.',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicons/favicon-16x16.png" />
        <link rel="shortcut icon" href="/assets/favicons/favicon.ico" />
      </head>
      <body className="bg-[#DDD5C0] h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
