import { setAttr } from "@directus/visual-editing"

export interface EditAttrOptions {
  collection: string
  item: string
  fields: string | string[]
  mode?: "modal" | "popover" | "drawer"
}

/**
 * Generate a data-directus attribute value for visual editing.
 * This is a pure function that can be called in server components.
 *
 * @example
 * <Heading data-directus={getEditAttr({
 *   collection: "block_hero",
 *   item: id,
 *   fields: "headline",
 *   mode: "popover"
 * })}>
 *   {headline}
 * </Heading>
 */
export function getEditAttr(options: EditAttrOptions): string {
  return setAttr({
    collection: options.collection,
    item: options.item,
    fields: options.fields,
    mode: options.mode ?? "popover",
  })
}
