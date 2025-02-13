import { faker } from '@faker-js/faker'
import { prisma } from '@/prisma-client'
import type { Prisma } from '@prisma/client'

export async function makeAccount(
  override: Partial<Prisma.AccountUncheckedCreateInput> = {},
) {
  const account: Prisma.AccountUncheckedCreateInput = {
    userId: faker.string.uuid(),
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    name: faker.company.name(),
    type: faker.helpers.arrayElement(['WALLET', 'BANK']),
    ...override,
  }

  const accountCreated = await prisma.account.create({
    data: { ...account },
  })

  return accountCreated
}
