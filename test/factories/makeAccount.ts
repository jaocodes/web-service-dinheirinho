import type { z } from 'zod'
import { faker } from '@faker-js/faker'
import type { createAccountBodySchema } from '@/http/controllers/accounts/create-account'
import { prisma } from '@/prisma-client'

type AccountZodSchema = z.infer<typeof createAccountBodySchema>

export async function makeAccount(override: Partial<AccountZodSchema> = {}) {
  const account: AccountZodSchema = {
    userId: faker.string.uuid(),
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    name: faker.company.name(),
    type: faker.helpers.arrayElement(['WALLET', 'BANK']),
    ...override,
  }

  const accountCreated = await prisma.account.create({
    data: { ...account, currentBalance: account.initialBalance },
  })

  return accountCreated
}
