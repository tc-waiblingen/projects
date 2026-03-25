import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseInboundEmail } from '../src/index.js'
import type { PostmarkInboundPayload } from '../src/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultFixture = resolve(__dirname, '../fixtures/postmark-apple-mail-macos-forward.json')
const arg = process.argv[2]
const filePath = arg ? resolve(arg) : defaultFixture

const payload: PostmarkInboundPayload = JSON.parse(readFileSync(filePath, 'utf-8'))
const result = parseInboundEmail(payload)

const separator = '─'.repeat(60)

console.log('\n' + separator)
console.log('PARSED INBOUND EMAIL')
console.log(separator)

console.log('\n📨 Forwarded by:')
console.log(`   ${result.forwardedBy.name} <${result.forwardedBy.email}>`)
console.log(`   Received: ${result.receivedAt}`)
console.log(`   Postmark ID: ${result.postmarkMessageId}`)

console.log('\n📧 Original email:')
console.log(`   From: ${result.original.from.name} <${result.original.from.email}>`)
console.log(`   Subject: ${result.original.subject}`)
console.log(`   Date: ${result.original.date}`)
console.log(`   To: ${result.original.to}`)
if (result.original.replyTo) {
  console.log(`   Reply-To: ${result.original.replyTo}`)
}

console.log('\n' + separator)
console.log('TEXT BODY (cleaned)')
console.log(separator)
console.log(result.body.text)

console.log('\n' + separator)
console.log('MARKDOWN BODY')
console.log(separator)
console.log(result.body.markdown)

console.log('\n' + separator)
console.log('HTML BODY (cleaned, first 500 chars)')
console.log(separator)
console.log(result.body.html.slice(0, 500))
if (result.body.html.length > 500) {
  console.log(`\n... (${result.body.html.length - 500} more characters)`)
}

console.log('\n' + separator + '\n')
