export interface PostmarkAddress {
  Email: string
  Name: string
  MailboxHash: string
}

export interface PostmarkHeader {
  Name: string
  Value: string
}

export interface PostmarkInboundPayload {
  FromName: string
  MessageStream: string
  From: string
  FromFull: PostmarkAddress
  To: string
  ToFull: PostmarkAddress[]
  Cc: string
  CcFull: PostmarkAddress[]
  Bcc: string
  BccFull: PostmarkAddress[]
  OriginalRecipient: string
  Subject: string
  MessageID: string
  ReplyTo: string
  MailboxHash: string
  Date: string
  TextBody: string
  HtmlBody: string
  StrippedTextReply: string
  Tag: string
  Headers: PostmarkHeader[]
  Attachments: unknown[]
}

export interface EmailContact {
  email: string
  name: string
}

export interface OriginalEmailMeta {
  from: EmailContact
  subject: string
  date: string
  to: string
  replyTo?: string
}

export interface ParsedInboundEmail {
  forwardedBy: EmailContact
  receivedAt: string
  postmarkMessageId: string
  original: OriginalEmailMeta
  body: {
    text: string
    markdown: string
    html: string
  }
}
