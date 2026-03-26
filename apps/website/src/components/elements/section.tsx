import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { getEditAttr } from '@/lib/visual-editing'
import { Container } from './container'
import { Eyebrow } from './eyebrow'
import { Subheading } from './subheading'
import { Text } from './text'

export function Section({
  eyebrow,
  headline,
  subheadline,
  cta,
  alignment,
  editAttr,
  className,
  children,
  ...props
}: {
  eyebrow?: ReactNode
  headline?: ReactNode
  subheadline?: ReactNode
  cta?: ReactNode
  alignment?: 'left' | 'center' | null
  editAttr?: { collection: string; item: string }
} & ComponentProps<'section'>) {
  const isCentered = alignment === 'center'

  function directusAttr(fields: string | string[]) {
    return editAttr ? getEditAttr({ ...editAttr, fields }) : undefined
  }

  return (
    <section className={clsx('py-8', className)} {...props}>
      <Container className={clsx('flex flex-col gap-2', isCentered && 'items-center')}>
        {headline && (
          <div className={clsx('flex max-w-2xl flex-col gap-4', isCentered && 'items-center')}>
            <div className={clsx('flex flex-col gap-2', isCentered && 'items-center')}>
              {eyebrow && <Eyebrow className={clsx(isCentered && 'text-center')} data-directus={directusAttr(["tagline", "tagline_button_type", "tagline_button_page", "tagline_button_post", "tagline_button_url", "tagline_button_label", "tagline_button_file"])}>{eyebrow}</Eyebrow>}
              <Subheading className={clsx(isCentered && 'text-center')} data-directus={directusAttr('headline')}>{headline}</Subheading>
            </div>
            {subheadline && <Text className={clsx('text-pretty', isCentered && 'text-center')} data-directus={directusAttr('subheadline')}>{subheadline}</Text>}
            {cta}
          </div>
        )}
        <div className="w-full">{children}</div>
      </Container>
    </section>
  )
}
