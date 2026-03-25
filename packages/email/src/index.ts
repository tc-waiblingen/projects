export type {
  PostmarkInboundPayload,
  ParsedInboundEmail,
  OriginalEmailMeta,
  EmailContact,
} from './types.js'

import type { PostmarkInboundPayload, ParsedInboundEmail } from './types.js'
import { parseForwardMeta } from './parse-forward-meta.js'
import { parseTextBody } from './parse-text-body.js'
import { parseHtmlBody } from './parse-html-body.js'
import { textToMarkdown } from './text-to-markdown.js'

export function parseInboundEmail(payload: PostmarkInboundPayload): ParsedInboundEmail {
  const meta = parseForwardMeta(payload.TextBody)
  const text = parseTextBody(payload.TextBody)

  return {
    forwardedBy: {
      email: payload.FromFull.Email,
      name: payload.FromFull.Name,
    },
    receivedAt: payload.Date,
    postmarkMessageId: payload.MessageID,
    original: meta ?? {
      from: { email: '', name: '' },
      subject: payload.Subject,
      date: payload.Date,
      to: '',
    },
    body: {
      text,
      markdown: textToMarkdown(text),
      html: parseHtmlBody(payload.HtmlBody),
    },
  }
}
