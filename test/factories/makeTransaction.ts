import { faker } from '@faker-js/faker'
import { prisma } from '@/prisma-client'
import type { Prisma } from '@prisma/client'

export async function makeTransaction(
  override: Partial<Prisma.TransactionUncheckedCreateInput> = {},
) {
  const categories = await prisma.category.findMany({
    take: 14,
    orderBy: { id: 'asc' },
  })

  const type =
    override.type || faker.helpers.arrayElement(['EXPENSE', 'INCOME'])

  const categoriesListFilteredByType = categories.filter(
    (category) => category.type === type,
  )

  const randomIndex = Math.floor(
    Math.random() * categoriesListFilteredByType.length,
  )

  const transaction: Prisma.TransactionUncheckedCreateInput = {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    description: faker.finance.transactionDescription(),
    amount: Number(faker.finance.amount({ min: 100, max: 20000, dec: 0 })),
    type,
    dueDate: faker.date.soon(),
    categoryId: categoriesListFilteredByType[randomIndex].id,
    ...override,
  }

  const transactionCreated = await prisma.transaction.create({
    data: transaction,
  })

  return transactionCreated
}
