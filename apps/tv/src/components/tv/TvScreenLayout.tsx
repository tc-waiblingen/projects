import type { ReactNode } from 'react'
import { ProgressIndicator } from './ProgressIndicator'
import { TcwLogoTextRight } from './TcwLogoTextRight'

interface TvScreenLayoutProps {
  children: ReactNode
  title?: string
  showTitle?: boolean
  duration?: number
  showLogo?: boolean
}

/**
 * Standard TV screen layout with top bar, title, and progress indicator.
 */
export function TvScreenLayout({
  children,
  title,
  showTitle = true,
  duration,
  showLogo = true,
}: TvScreenLayoutProps) {
  return (
    <>
      {/* Top bar with logo, title, and progress */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center bg-white px-8 py-4">
        <div className="flex items-center">{showLogo && <TcwLogoTextRight />}</div>
        {title && showTitle && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-center tv-title font-light">{title}</h1>
          </div>
        )}
        <div className="ml-auto flex items-center justify-end">{duration && <ProgressIndicator duration={duration} />}</div>
      </div>

      {/* Main content */}
      <main>{children}</main>
    </>
  )
}
