import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { prisma } from '@/prisma-client'
import { randomUUID } from 'node:crypto'

export const createCreditExpenseBodySchema = z.object({
  creditCardId: z.string().uuid(),
  description: z.string(),
  amount: z.coerce.number().int(),
  dueDate: z.coerce.date(),
  installments: z.coerce.number().int().min(1).max(99).default(1),
  categoryId: z.coerce.number().int(),
  observations: z.string().optional(),
  isFixed: z.boolean().default(false),
  type: z.enum(['CREDIT']).default('CREDIT'),
})

export function getDueDateInvoice(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
): Date {
  const purchaseDay = purchaseDate.getDate()

  if (purchaseDay > closingDay) {
    const nextDueDateInvoice = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth() + 1,
      dueDay,
    )
    return nextDueDateInvoice
  }

  const currentDueDateInvoice = new Date(
    purchaseDate.getFullYear(),
    purchaseDate.getMonth(),
    dueDay,
  )

  return currentDueDateInvoice
}

export const createCreditExpense: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transactions/credit',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createCreditExpenseBodySchema,
        response: {
          201: z.null(),
          409: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub
      const {
        creditCardId,
        description,
        amount,
        categoryId,
        dueDate,
        isFixed,
        installments,
        type,
        observations,
      } = request.body

      const creditCard = await prisma.creditCard.findFirst({
        where: {
          id: creditCardId,
          userId,
        },
        select: { dueDay: true, closingDay: true, accountId: true },
      })

      if (!creditCard) {
        return reply.status(409).send({ message: 'Conflit' })
      }

      if (!isFixed && installments === 1) {
        const invoiceDate = getDueDateInvoice(
          dueDate,
          creditCard.closingDay,
          creditCard.dueDay,
        )

        await prisma.transaction.create({
          data: {
            description,
            amount,
            observations,
            type,
            accountId: creditCard.accountId,
            creditCardId,
            categoryId,
            dueDate,
            userId,
            invoiceDate,
          },
        })

        return reply.status(201).send()
      }

      if (installments > 1) {
        const installmentId = randomUUID()

        const transactionsToCreate = []
        const installmentAmount =
          Math.round((amount / installments) * 100) / 100
        const currentDate = new Date(dueDate)

        for (let index = 0; index < installments; index++) {
          const invoiceDate = getDueDateInvoice(
            currentDate,
            creditCard.closingDay,
            creditCard.dueDay,
          )

          transactionsToCreate.push({
            description: `${description} (${index + 1}/${installments})`,
            amount: installmentAmount,
            observations,
            type,
            accountId: creditCard.accountId,
            creditCardId,
            categoryId,
            dueDate: new Date(currentDate),
            userId,
            invoiceDate,
            installmentId,
            installments,
            installmentNum: index + 1,
          })

          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        await prisma.transaction.createMany({ data: transactionsToCreate })
        return reply.status(201).send()
      }

      if (isFixed) {
        const fixedId = randomUUID()

        const transactionsToCreate = []
        const installmentAmount = Math.round((amount / 12) * 100) / 100
        const currentDate = new Date(dueDate)

        for (let index = 0; index < 12; index++) {
          const invoiceDate = getDueDateInvoice(
            currentDate,
            creditCard.closingDay,
            creditCard.dueDay,
          )

          transactionsToCreate.push({
            description,
            amount: installmentAmount,
            observations,
            type,
            accountId: creditCard.accountId,
            creditCardId,
            categoryId,
            dueDate: new Date(currentDate),
            userId,
            invoiceDate,
            isFixed,
            fixedId,
          })

          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        await prisma.transaction.createMany({ data: transactionsToCreate })

        return reply.status(201).send()
      }
    },
  )
}
