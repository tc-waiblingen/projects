#!/usr/bin/env node

import { randomBytes } from 'crypto'

const secret = randomBytes(32).toString('base64')

console.log('\nGenerated signing secret:\n')
console.log(`URL_SIGNING_SECRET=${secret}`)
console.log('\nAdd this to your .env file.\n')
