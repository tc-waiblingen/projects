import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { Container } from '../elements/container'
import { Heading } from '../elements/heading'
import { Text } from '../elements/text'

export function HeroTwoColumnWithPhoto({
  eyebrow,
  headline,
  subheadline,
  cta,
  photo,
  className,
  ...props
}: {
  eyebrow?: ReactNode
  headline: ReactNode
  subheadline: ReactNode
  cta?: ReactNode
  photo?: ReactNode
} & ComponentProps<'section'>) {
  return (
    <section className={clsx('py-8', className)} {...props}>
      <Container className="flex gap-8 max-xl:flex-col">
        <div className="flex flex-1 flex-col items-start justify-center gap-4">
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
          <div className="flex flex-1 overflow-hidden rounded-xl outline -outline-offset-1 outline-black/5 *:object-cover dark:outline-white/5">
            {photo}
          </div>
        )}
      </Container>
    </section>
  )
}
