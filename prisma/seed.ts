import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/prisma-client"

export async function seedCategories() {
  const dataToSeed: Prisma.CategoryUncheckedCreateInput[] = [
    { name: 'Salário', type: 'INCOME' },
    { name: 'Prêmio', type: 'INCOME' },
    { name: 'Bonificação', type: 'INCOME' },
    { name: 'Investimento', type: 'INCOME' },
    { name: 'Presente', type: 'INCOME' },
    { name: 'Freelance', type: 'INCOME' },
    { name: 'Alimentação', type: 'EXPENSE' },
    { name: 'Transporte', type: 'EXPENSE' },
    { name: 'Moradia', type: 'EXPENSE' },
    { name: 'Lazer', type: 'EXPENSE' },
    { name: 'Restaurante', type: 'EXPENSE' },
    { name: 'Supermercado', type: 'EXPENSE' },
    { name: 'Vestuário', type: 'EXPENSE' },
    { name: 'Viagem', type: 'EXPENSE' },
    { name: 'Transferência entrada', type: 'TRANSFER_IN' },
    { name: 'Transferência saída', type: 'TRANSFER_OUT' },
  ]

  await prisma.category.createMany({
    data: dataToSeed,
  })
}

seedCategories()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
