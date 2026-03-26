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
  photoSide = 'right',
  ...props
}: {
  eyebrow?: ReactNode
  headline: ReactNode
  subheadline: ReactNode
  cta?: ReactNode
  photo?: ReactNode
  photoSide?: 'left' | 'right'
} & ComponentProps<'section'>) {
  const textCol = photoSide === 'left' ? 'xl:col-start-2' : 'xl:col-start-1'
  const photoCol = photoSide === 'left' ? 'xl:col-start-1' : 'xl:col-start-2'

  return (
    <section className="py-8" {...props}>
      <Container className="grid gap-x-8 gap-y-4 xl:grid-cols-2 xl:grid-rows-[auto_1fr]">
        <div className={clsx('self-end', textCol)}>{eyebrow}</div>
        <div className={clsx('flex flex-col items-start gap-4', textCol)}>
          <Heading>{headline}</Heading>
          {subheadline && (
            <Text size="lg" className="flex max-w-3xl flex-col gap-4">
              {subheadline}
            </Text>
          )}
          {cta}
        </div>
        {photo && (
          <div
            className={clsx(
              'overflow-hidden rounded-xl outline -outline-offset-1 outline-black/5 *:object-cover dark:outline-white/5',
              photoCol,
              'xl:row-start-2',
            )}
          >
            {photo}
          </div>
        )}
      </Container>
    </section>
  )
}
