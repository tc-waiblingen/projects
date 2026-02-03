import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { Container } from '../elements/container'
import { Heading } from '../elements/heading'
import { Text } from '../elements/text'

export function HeroLeftAlignedWithPhoto({
  eyebrow,
  headline,
  subheadline,
  cta,
  photo,
  footer,
  className,
  ...props
}: {
  eyebrow?: ReactNode
  headline: ReactNode
  subheadline: ReactNode
  cta?: ReactNode
  photo?: ReactNode
  footer?: ReactNode
} & ComponentProps<'section'>) {
  return (
    <section className={clsx('py-8', className)} {...props}>
      <Container className="flex flex-col gap-16">
        <div className="flex flex-col gap-32">
          <div className="flex flex-col items-start gap-4">
            {eyebrow}
            <Heading>{headline}</Heading>
            {subheadline && (
              <Text size="lg" className="flex max-w-3xl flex-col gap-4">
                {subheadline}
              </Text>
            )}
            {cta}
          </div>
          {photo && (
            <div className="overflow-hidden rounded-xl outline -outline-offset-1 outline-black/5 dark:outline-white/5">
              {photo}
            </div>
          )}
        </div>
        {footer}
      </Container>
    </section>
  )
}
