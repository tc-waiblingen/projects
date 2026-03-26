import { clsx } from "clsx/lite"
import type { BlockButtonGroup } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { ButtonGroup } from "./ButtonGroup"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockButtonGroupBlockProps {
  data: BlockButtonGroup
  currentPath?: string
}

export function BlockButtonGroupBlock({ data, currentPath }: BlockButtonGroupBlockProps) {
  const { id, alignment } = data

  return (
    <Section alignment={alignment}>
      <div
        className={clsx(
          "flex",
          alignment === "center" ? "justify-center" : "justify-start"
        )}
        data-directus={getEditAttr({ collection: "block_button_group", item: String(id), fields: "buttons" })}
      >
        <ButtonGroup data={data} currentPath={currentPath} />
      </div>
    </Section>
  )
}
