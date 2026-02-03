import { clsx } from 'clsx/lite'
import { formatPhoneNumber } from '@/lib/phone-number-helper'
import { PhoneIcon } from '@/components/icons/phone-icon'
import { GlobeIcon } from '@/components/icons/globe-icon'
import { MailIcon } from '@/components/icons/mail-icon'
import { InstagramIcon } from '@/components/icons/social/instagram-icon'
import { FacebookIcon } from '@/components/icons/social/facebook-icon'

export type ContactInfoType = 'website' | 'phone' | 'email' | 'instagram' | 'facebook'

interface ContactInfoProps {
  type: ContactInfoType
  value: string
  name?: string
  showIcon?: boolean
  label?: string
  title?: string
  className?: string
  iconClassName?: string
}

function getDisplayText(type: ContactInfoType, value: string): string {
  switch (type) {
    case 'website':
      try {
        const url = new URL(value)
        const host = url.hostname.replace(/^www\./, '')
        const path = url.pathname.replace(/\/$/, '')
        return path && path !== '/' ? `${host}${path}` : host
      } catch {
        return value.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      }
    case 'phone':
      return formatPhoneNumber(value)
    case 'email':
      return value.replace(/^mailto:/i, '')
    case 'instagram':
      try {
        const url = new URL(value)
        const path = url.pathname.replace(/^\/|\/$/g, '')
        return path ? `@${path}` : 'Instagram'
      } catch {
        return value.startsWith('@') ? value : `@${value}`
      }
    case 'facebook':
      try {
        const url = new URL(value)
        const path = url.pathname.replace(/^\/|\/$/g, '')
        return path || 'Facebook'
      } catch {
        return value
      }
    default:
      return value
  }
}

function getHref(type: ContactInfoType, value: string): string {
  switch (type) {
    case 'phone':
      return `tel:${value}`
    case 'email':
      return value.startsWith('mailto:') ? value : `mailto:${value}`
    default:
      return value
  }
}

function isExternalLink(type: ContactInfoType): boolean {
  return type !== 'phone' && type !== 'email'
}

function getTitle(type: ContactInfoType, name?: string): string | undefined {
  if (!name) return undefined

  switch (type) {
    case 'website':
      return `Webseite von ${name}`
    case 'phone':
      return `${name} anrufen`
    case 'email':
      return `${name} eine E-Mail schreiben`
    case 'instagram':
      return `Besuche ${name} bei Instagram`
    case 'facebook':
      return `Besuche ${name} bei Facebook`
    default:
      return undefined
  }
}

function ContactIcon({ type, className }: { type: ContactInfoType; className?: string }) {
  const iconClassName = clsx('size-[13px]', className)

  switch (type) {
    case 'website':
      return <GlobeIcon className={iconClassName} aria-hidden="true" />
    case 'phone':
      return <PhoneIcon className={iconClassName} aria-hidden="true" />
    case 'email':
      return <MailIcon className={iconClassName} aria-hidden="true" />
    case 'instagram':
      return <InstagramIcon className={iconClassName} aria-hidden="true" />
    case 'facebook':
      return <FacebookIcon className={iconClassName} aria-hidden="true" />
    default:
      return null
  }
}

export function ContactInfo({
  type,
  value,
  name,
  showIcon = true,
  label,
  title: titleProp,
  className,
  iconClassName,
}: ContactInfoProps) {
  const displayText = label ?? getDisplayText(type, value)
  const href = getHref(type, value)
  const external = isExternalLink(type)
  const title = titleProp ?? getTitle(type, name)

  return (
    <a
      href={href}
      title={title}
      {...(external && {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      })}
      className={clsx('inline-flex cursor-pointer items-center gap-1.5', className)}
    >
      {showIcon && <ContactIcon type={type} className={iconClassName} />}
      <span>{displayText}</span>
    </a>
  )
}
