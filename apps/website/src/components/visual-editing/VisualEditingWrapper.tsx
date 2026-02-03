"use client"

import { apply as applyVisualEditing } from "@directus/visual-editing"
import { useVisualEditing } from "@/hooks/useVisualEditing"
import { Suspense, useEffect, useRef, type ReactNode } from "react"

interface VisualEditingWrapperProps {
  children: ReactNode
  itemId?: string
  collection?: string
}

export function VisualEditingWrapper({ children, itemId, collection = 'pages' }: VisualEditingWrapperProps) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <VisualEditingControls itemId={itemId} collection={collection} />
      </Suspense>
    </>
  )
}

function VisualEditingControls({ itemId, collection }: { itemId?: string; collection: string }) {
  const { isVisualEditingEnabled, refresh, disable } = useVisualEditing()
  const appliedRef = useRef(false)

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || ""
  const enableVisualEditingEnv = process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITING === "true"

  // Apply visual editing SDK when env is enabled AND query param is set
  useEffect(() => {
    if (!enableVisualEditingEnv || !isVisualEditingEnabled || appliedRef.current) return
    if (typeof window === "undefined") return

    appliedRef.current = true
    applyVisualEditing({
      directusUrl,
      onSaved: () => {
        refresh()
      },
    })
  }, [directusUrl, enableVisualEditingEnv, isVisualEditingEnabled, refresh])

  if (!isVisualEditingEnabled) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      {itemId && (
        <a
          href={`${directusUrl}/admin/content/${collection}/${itemId}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="cursor-pointer rounded-full bg-tcw-accent-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-tcw-accent-800 dark:bg-white dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-100"
        >
          Seite bearbeiten
        </a>
      )}
      <button
        onClick={disable}
        className="cursor-pointer rounded-full bg-tcw-accent-700 px-3 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-tcw-accent-600 dark:bg-tcw-accent-200 dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-300"
        title="Visual Editing deaktivieren"
      >
        ✕
      </button>
    </div>
  )
}
