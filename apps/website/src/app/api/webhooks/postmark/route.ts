import { NextRequest, NextResponse } from 'next/server'
import {
  createDirectus,
  staticToken,
  rest,
  createItem,
} from '@directus/sdk'
import { parseInboundEmail } from '@tcw/email'
import type { PostmarkInboundPayload, ParsedInboundEmail } from '@tcw/email'
import type { Schema } from '@/types/directus-schema'
import { marked } from 'marked'

const WTB_MARKER = '[WTB Newsletter]'

const GERMAN_MONTHS: Record<string, string> = {
  'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
  'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
  'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12',
}

function validateBasicAuth(request: NextRequest): boolean {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  const decoded = atob(header.slice(6))
  const [username, password] = decoded.split(':')

  return (
    username === process.env.POSTMARK_WEBHOOK_USERNAME &&
    password === process.env.POSTMARK_WEBHOOK_PASSWORD
  )
}

function getDirectusClient() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_LIMITED_WRITE_TOKEN

  if (!url || !token) {
    throw new Error(
      'NEXT_PUBLIC_DIRECTUS_URL and DIRECTUS_LIMITED_WRITE_TOKEN must be set'
    )
  }

  return createDirectus<Schema>(url)
    .with(staticToken(token))
    .with(rest())
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseGermanDate(dateStr: string): Date | null {
  // "25. März 2026 um 07:56:23 MEZ"
  const match = dateStr.match(
    /(\d{1,2})\.\s+(\S+)\s+(\d{4})\s+um\s+(\d{2}):(\d{2}):(\d{2})/
  )
  if (!match) return null

  const day = match[1]!
  const month = GERMAN_MONTHS[match[2]!]
  const year = match[3]!
  const time = `${match[4]!}:${match[5]!}:${match[6]!}`
  if (!month) return null

  return new Date(`${year}-${month}-${day.padStart(2, '0')}T${time}`)
}

function markdownToHtml(markdown: string): string {
  const renderer = new marked.Renderer()
  const originalLink = renderer.link.bind(renderer)

  renderer.link = function (args) {
    const html = originalLink(args)
    return html.replace(
      '<a ',
      '<a target="_blank" rel="noopener noreferrer nofollow" '
    )
  }

  return marked(markdown, { renderer, async: false }) as string
}

function buildWtbPost(parsed: ParsedInboundEmail) {
  const lines = parsed.body.markdown.split('\n')
  // Remove [WTB Newsletter] line
  lines.shift()

  // Remove "Verantwortlich für den Inhalt" and everything after
  const cutIdx = lines.findIndex(l => l.includes('Verantwortlich für den Inhalt'))
  if (cutIdx !== -1) lines.splice(cutIdx)

  // Remove trailing empty lines after cut
  while (lines.length > 0 && lines.at(-1)?.trim() === '') {
    lines.pop()
  }

  // Quote all lines
  const quoted = lines.map(l => `> ${l}`)
  const content = markdownToHtml(`Der WTB teilt mit:\n\n${quoted.join('\n')}`)

  const subject = parsed.original.subject
  const originalDate = parseGermanDate(parsed.original.date)
  const year = originalDate?.getFullYear() ?? new Date().getFullYear()

  return {
    title: `[WTB-News] ${subject}`,
    content,
    status: 'in_review' as const,
    published_at: originalDate?.toISOString() ?? undefined,
    slug: `${year}-wtb-news-${slugify(subject)}`,
    group: '2',
  }
}

function buildDefaultPost(parsed: ParsedInboundEmail) {
  const content = markdownToHtml(parsed.body.markdown)

  return {
    title: parsed.original.subject,
    content,
    status: 'in_review' as const,
  }
}

export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
    )
  }

  let payload: PostmarkInboundPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const parsed = parseInboundEmail(payload)
  const isWtb = parsed.body.markdown.startsWith(WTB_MARKER)
  const postData = isWtb ? buildWtbPost(parsed) : buildDefaultPost(parsed)

  try {
    const directus = getDirectusClient()
    const post = await directus.request(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createItem('posts' as any, postData)
    )

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Postmark webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
