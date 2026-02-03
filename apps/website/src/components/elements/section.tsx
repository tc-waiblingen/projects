import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
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
  className,
  children,
  ...props
}: {
  eyebrow?: ReactNode
  headline?: ReactNode
  subheadline?: ReactNode
  cta?: ReactNode
  alignment?: 'left' | 'center' | null
} & ComponentProps<'section'>) {
  const isCentered = alignment === 'center'

  return (
    <section className={clsx('py-8', className)} {...props}>
      <Container className={clsx('flex flex-col gap-6 sm:gap-12', isCentered && 'items-center')}>
        {headline && (
          <div className={clsx('flex max-w-2xl flex-col gap-4', isCentered && 'items-center')}>
            <div className={clsx('flex flex-col gap-2', isCentered && 'items-center')}>
              {eyebrow && <Eyebrow className={clsx(isCentered && 'text-center')}>{eyebrow}</Eyebrow>}
              <Subheading className={clsx(isCentered && 'text-center')}>{headline}</Subheading>
            </div>
            {subheadline && <Text className={clsx('text-pretty', isCentered && 'text-center')}>{subheadline}</Text>}
            {cta}
          </div>
        )}
        <div className="w-full">{children}</div>
      </Container>
    </section>
  )
}
