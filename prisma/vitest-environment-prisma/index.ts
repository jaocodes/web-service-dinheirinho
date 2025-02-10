import type { Environment } from 'vitest/environments'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default (<Environment>{
  name: 'prisma',
  transformMode: 'ssr',
  async setup() {
    const schema = randomUUID()

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não está definido no .env')
    }
    const url = new URL(process.env.DATABASE_URL)

    url.searchParams.set('schema', schema)

    process.env.DATABASE_URL = url.toString()

    execSync('npx prisma migrate deploy')

    return {
      async teardown() {
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
        )
        await prisma.$disconnect()
      },
    }
  },
})
