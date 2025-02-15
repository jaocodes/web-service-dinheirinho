import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { prisma } from '@/prisma-client'

export const createCreditExpenseBodySchema = z.object({
  creditCardId: z.string().uuid(),
  description: z.string(),
  amount: z.coerce.number().int(),
  dueDate: z.coerce.date(),
  installments: z.coerce.number().int().optional(),
  invoiceDate: z.coerce.date().optional(),
  categoryId: z.coerce.number().int(),
  observations: z.string().optional(),
  type: z.enum(['CREDIT']),
  isFixed: z.boolean().default(false),
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
        invoiceDate,
        type,
        isFixed,
        installments,

        observations,
      } = request.body

      const creditCard = await prisma.creditCard.findFirst({
        where: {
          id: creditCardId,
          userId,
        },
        select: { closingDay: true, accountId: true },
      })

      if (!creditCard) {
        return reply.status(409).send({ message: 'Conflit' })
      }

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
    },
  )
}
