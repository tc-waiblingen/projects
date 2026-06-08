"use client"

import { useVisualEditing } from "@/hooks/useVisualEditing"
import { useEffect, useRef } from "react"

export function VisualEditingControls({ itemId, collection }: { itemId?: string; collection: string }) {
  const { isVisualEditingEnabled, refresh, disable } = useVisualEditing()
  const appliedRef = useRef(false)

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || ""

  useEffect(() => {
    if (!isVisualEditingEnabled || appliedRef.current) return

    let cancelled = false
    appliedRef.current = true

    async function applyVisualEditing() {
      const { apply } = await import("@directus/visual-editing")
      if (cancelled) return

      apply({
        directusUrl,
        onSaved: () => {
          refresh()
        },
      })
    }

    applyVisualEditing()

    return () => {
      cancelled = true
    }
  }, [directusUrl, isVisualEditingEnabled, refresh])

  if (!isVisualEditingEnabled) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 print:hidden">
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
