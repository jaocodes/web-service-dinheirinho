import { faker } from '@faker-js/faker'
import type { createTransactionBodySchema } from '@/http/controllers/transactions/create-transaction'
import type { z } from 'zod'

type TransactionZodSchema = z.infer<typeof createTransactionBodySchema>

export async function makeAccount(
  override: Partial<TransactionZodSchema> = {},
) {
  const transaction: TransactionZodSchema = {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    description: faker.finance.transactionDescription(),
    amount: Number(faker.finance.amount({ min: 100, max: 20000, dec: 0 })),
    type: faker.helpers.arrayElement(['EXPENSE', 'INCOME']),
    dueDate: faker.date.soon(),
    ...override,
  }

  return transaction
}
