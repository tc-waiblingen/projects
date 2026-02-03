import { clsx } from "clsx/lite"
import type { BlockButtonGroup } from "@/types/directus-schema"
import { ButtonGroup } from "./ButtonGroup"
import { Container } from "@/components/elements/container"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockButtonGroupBlockProps {
  data: BlockButtonGroup
  currentPath?: string
}

export function BlockButtonGroupBlock({ data, currentPath }: BlockButtonGroupBlockProps) {
  const { id, alignment } = data

  return (
    <section className="py-8">
      <Container
        className={clsx(
          "flex",
          alignment === "center" ? "justify-center" : "justify-start"
        )}
      >
        <div data-directus={getEditAttr({ collection: "block_button_group", item: String(id), fields: "buttons" })}>
          <ButtonGroup data={data} currentPath={currentPath} />
        </div>
      </Container>
    </section>
  )
}
