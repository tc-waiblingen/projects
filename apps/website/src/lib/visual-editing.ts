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
export function getEditAttr(options: EditAttrOptions): string | undefined {
  if (process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITING !== "true") {
    return undefined
  }

  const fields = Array.isArray(options.fields)
    ? options.fields.join(",")
    : options.fields

  return [
    `collection:${options.collection}`,
    `item:${options.item}`,
    `fields:${fields}`,
    `mode:${options.mode ?? "popover"}`,
  ].join(";")
}
