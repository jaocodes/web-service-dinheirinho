import { faker } from '@faker-js/faker'

import { prisma } from '@/prisma-client'
import type { Prisma } from '@prisma/client'

export async function makeTransaction(
  override: Partial<Prisma.TransactionUncheckedCreateInput> = {},
) {
  const transaction: Prisma.TransactionUncheckedCreateInput = {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    description: faker.finance.transactionDescription(),
    amount: Number(faker.finance.amount({ min: 100, max: 20000, dec: 0 })),
    type: faker.helpers.arrayElement(['EXPENSE', 'INCOME']),
    dueDate: faker.date.soon(),
    ...override,
  }

  const transactionCreated = await prisma.transaction.create({
    data: transaction,
  })

  return transactionCreated
}
