import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'

export const fetchTransactionParamsSchema = z.object({
  userId: z.string().uuid(),
})

const fetchTransactionQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

const transactionsResponseSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string().uuid(),
      description: z.string(),
      observations: z.string().nullable(),
      amount: z.number().int(),
      type: z.enum(['INCOME', 'EXPENSE']),
      effectived: z.coerce.boolean(),
      isRecurring: z.coerce.boolean(),
      isFixed: z.coerce.boolean(),
      recurrenceId: z.string().nullable(),
      fixedId: z.string().nullable(),
      dueDate: z.date(),
      createdAt: z.date(),
      updatedAt: z.date(),
      account: z.object({ name: z.string() }),
    }),
  ),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

export const fetchTransactions: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/transactions/:userId',
    {
      schema: {
        querystring: fetchTransactionQuerySchema,
        params: fetchTransactionParamsSchema,
        response: {
          200: transactionsResponseSchema,
          409: userNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params
      const { month } = request.query

      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setMilliseconds(-1)

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!userExists) {
        return reply.status(409).send({ message: 'User does not exists' })
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          dueDate: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          account: {
            select: { name: true },
          },
        },
      })
      return reply.status(200).send({ transactions })
    },
  )
}
