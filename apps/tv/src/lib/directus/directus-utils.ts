import { DirectusFile } from "@/types/directus-schema"

export function getDirectusAssetURL(fileOrString: string | DirectusFile | null | undefined): string {
  if (!fileOrString) return ""

  if (typeof fileOrString === "string") {
    return `/api/images/${fileOrString}`
  }

  return `/api/images/${fileOrString.id}`
}
