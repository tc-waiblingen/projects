import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { Container } from '../elements/container'
import { Document } from '../elements/document'
import { Heading } from '../elements/heading'
import { Text } from '../elements/text'

export function DocumentCentered({
  headline,
  subheadline,
  className,
  children,
  headlineLevel = 'h1',
  ...props
}: {
  headline: ReactNode
  headlineLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  subheadline?: ReactNode
} & ComponentProps<'section'>) {
  return (
    <section className={clsx('py-8', className)} {...props}>
      <Container className="flex flex-col gap-10 sm:gap-16">
        {(headline || subheadline) && <div className="flex flex-col items-center gap-6">
          {headline && <Heading as={headlineLevel} className="text-center">{headline}</Heading>}
          {subheadline && (
            <Text size="lg" className="flex max-w-xl flex-col gap-4 text-center">
              {subheadline}
            </Text>
          )}
        </div>}
        <Document className="mx-auto max-w-2xl">{children}</Document>
      </Container>
    </section>
  )
}
