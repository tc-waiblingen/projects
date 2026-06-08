import { Suspense, type ReactNode } from "react"
import { VisualEditingControls } from "./VisualEditingControls"

interface VisualEditingWrapperProps {
  children: ReactNode
  itemId?: string
  collection?: string
}

export function VisualEditingWrapper({ children, itemId, collection = 'pages' }: VisualEditingWrapperProps) {
  if (process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITING !== "true") {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <VisualEditingControls itemId={itemId} collection={collection} />
      </Suspense>
    </>
  )
}
