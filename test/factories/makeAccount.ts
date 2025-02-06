import type { z } from 'zod'
import { faker } from '@faker-js/faker'
import type { createAccountBodySchema } from '@/http/controllers/accounts/create-account'

type AccountZodSchema = z.infer<typeof createAccountBodySchema>

export async function makeAccount(override: Partial<AccountZodSchema> = {}) {
  const account: AccountZodSchema = {
    userId: faker.string.uuid(),
    balance: faker.number.int({ min: 0, max: 10000 }),
    name: faker.company.name(),
    type: faker.helpers.arrayElement(['WALLET', 'BANK']),
    ...override,
  }

  return account
}
