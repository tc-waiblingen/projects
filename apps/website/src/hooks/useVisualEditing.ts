"use client"

import { apply as applyVisualEditing, setAttr } from "@directus/visual-editing"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, useSyncExternalStore } from "react"

interface ApplyOptions {
  elements?: HTMLElement[] | HTMLElement
  onSaved?: () => void
  mode?: "modal" | "popover" | "drawer"
}

// Use useSyncExternalStore to sync with localStorage
function getSnapshot(): boolean {
  return localStorage.getItem("visual-editing") === "true"
}

function getServerSnapshot(): boolean {
  return false
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function useVisualEditing() {
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isVisualEditingEnabled, setIsVisualEditingEnabled] = useState(storedValue)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const enableVisualEditingEnv = process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITING === "true"
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || ""

  // Sync internal state with external store
  useEffect(() => {
    setIsVisualEditingEnabled(storedValue)
  }, [storedValue])

  useEffect(() => {
    if (typeof window === "undefined") return

    const param = searchParams.get("visual-editing")

    if (!enableVisualEditingEnv) {
      if (param === "true") {
        console.warn("Visual editing is not enabled in this environment.")
      }
      return
    }

    // Handle URL parameter to enable/disable
    if (param === "true") {
      localStorage.setItem("visual-editing", "true")
      setIsVisualEditingEnabled(true)
    } else if (param === "false") {
      localStorage.removeItem("visual-editing")
      setIsVisualEditingEnabled(false)

      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete("visual-editing")

      const cleanUrl = pathname + (newParams.toString() ? `?${newParams}` : "")
      window.history.replaceState({}, "", cleanUrl)
    }

  }, [searchParams, pathname, enableVisualEditingEnv])

  const apply = useCallback((options: Pick<ApplyOptions, "elements" | "onSaved" | "mode">) => {
    if (!isVisualEditingEnabled) return

    applyVisualEditing({
      ...options,
      directusUrl,
    })
  }, [isVisualEditingEnabled, directusUrl])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const disable = useCallback(() => {
    localStorage.removeItem("visual-editing")
    setIsVisualEditingEnabled(false)

    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("visual-editing")

    const cleanUrl = pathname + (newParams.toString() ? `?${newParams}` : "")
    window.history.replaceState({}, "", cleanUrl)
  }, [searchParams, pathname])

  return {
    isVisualEditingEnabled,
    apply,
    setAttr,
    refresh,
    disable,
  }
}
