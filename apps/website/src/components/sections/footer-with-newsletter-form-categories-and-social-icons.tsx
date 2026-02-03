import { clsx } from 'clsx/lite'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { Container } from '../elements/container'
import { ArrowNarrowRightIcon } from '../icons/arrow-narrow-right-icon'

export function FooterCategory({
  title,
  titleDataDirectus,
  children,
  ...props
}: {
  title: ReactNode
  titleDataDirectus?: string
} & ComponentProps<'div'>) {
  return (
    <div {...props}>
      <h3>
        {titleDataDirectus ? (
          <span data-directus={titleDataDirectus}>{title}</span>
        ) : (
          title
        )}
      </h3>
      <ul role="list" className="mt-2 flex flex-col gap-2">
        {children}
      </ul>
    </div>
  )
}

export function FooterLink({
  href,
  className,
  contentDataDirectus,
  children,
  ...props
}: {
  href: string
  contentDataDirectus?: string
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <li className={clsx('text-muted', className)}>
      <Link href={href} {...props}>
        {contentDataDirectus ? (
          <span data-directus={contentDataDirectus}>{children}</span>
        ) : (
          children
        )}
      </Link>
    </li>
  )
}

export function SocialLink({
  href,
  name,
  className,
  contentDataDirectus,
  children,
  ...props
}: {
  href: string
  name: string
  contentDataDirectus?: string
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <Link
      href={href}
      target="_blank"
      aria-label={name}
      className={clsx('text-tcw-accent-900 *:size-6 dark:text-white', className)}
      rel="noopener noreferrer"
      {...props}
    >
      {contentDataDirectus ? (
        <span data-directus={contentDataDirectus}>{children}</span>
      ) : (
        children
      )}
    </Link>
  )
}

export function NewsletterForm({
  headline,
  subheadline,
  className,
  ...props
}: {
  headline: ReactNode
  subheadline: ReactNode
} & ComponentProps<'form'>) {
  return (
    <form className={clsx('flex max-w-sm flex-col gap-2', className)} {...props}>
      <p>{headline}</p>
      <div className="flex flex-col gap-4 text-muted">{subheadline}</div>
      <div className="flex items-center border-b border-tcw-accent-900/20 py-2 has-[input:focus]:border-tcw-accent-900 dark:border-white/20 dark:has-[input:focus]:border-white">
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          className="flex-1 text-tcw-accent-900 focus:outline-hidden dark:text-white"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className="relative inline-flex size-7 items-center justify-center rounded-full after:absolute after:-inset-2 hover:bg-tcw-accent-900/10 dark:hover:bg-white/10 after:pointer-fine:hidden"
        >
          <ArrowNarrowRightIcon />
        </button>
      </div>
    </form>
  )
}

export function FooterWithNewsletterFormCategoriesAndSocialIcons({
  cta,
  links,
  fineprint,
  socialLinks,
  sponsors,
  className,
  ...props
}: {
  cta?: ReactNode
  links: ReactNode
  fineprint: ReactNode
  socialLinks?: ReactNode
  sponsors?: ReactNode
} & ComponentProps<'footer'>) {
  return (
    <footer className={clsx('pt-16', className)} {...props}>
      {sponsors && (
        <div className="bg-tcw-accent-900/5 py-12 dark:bg-white/2.5">
          <Container>
            {sponsors}
          </Container>
        </div>
      )}
      <div className="bg-tcw-accent-900/2.5 py-16 text-tcw-accent-900 dark:bg-white/5 dark:text-white">
        <Container className="flex flex-col gap-16">
          <div className="grid grid-cols-1 gap-x-6 gap-y-16 text-sm/7 lg:grid-cols-2">
            {cta}
            <nav className="grid grid-cols-2 gap-6 sm:has-[>:last-child:nth-child(3)]:grid-cols-3 sm:has-[>:nth-child(5)]:grid-cols-3 md:has-[>:last-child:nth-child(4)]:grid-cols-4 lg:max-xl:has-[>:last-child:nth-child(4)]:grid-cols-2">
              {links}
            </nav>
          </div>
          <div className="flex items-center justify-between gap-10 text-sm/7">
            <div className="text-tcw-accent-600 dark:text-tcw-accent-500">{fineprint}</div>
            {socialLinks && <div className="flex items-center gap-4 sm:gap-10">{socialLinks}</div>}
          </div>
        </Container>
      </div>
    </footer>
  )
}
