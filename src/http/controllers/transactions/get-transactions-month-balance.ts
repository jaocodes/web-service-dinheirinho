import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'
import { endOfMonth, startOfMonth } from 'date-fns'
import { verifyJWT } from '../hooks/verify-jwt'

export const fetchTransactionParamsSchema = z.object({
  userId: z.string().uuid(),
})

const fetchTransactionQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

const bodyResponseSchema = z.object({
  totalIncome: z.number().int(),
  totalExpense: z.number().int(),
  balance: z.number().int(),
})

const NotFoundResponse = z.object({
  message: z.string(),
})

export const getTransactionsMonthBalance: FastifyPluginAsyncZod = async (
  app,
) => {
  app.get(
    '/transactions/:userId/balance',
    {
      onRequest: [verifyJWT],
      schema: {
        querystring: fetchTransactionQuerySchema,
        params: fetchTransactionParamsSchema,
        response: {
          200: bodyResponseSchema,
          404: NotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params
      const { month } = request.query

      const startDateOfMonth = startOfMonth(
        new Date(`${month}-01T03:00:00.000Z`),
      )
      const endDateOfMonth = endOfMonth(startDateOfMonth)

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!userExists) {
        return reply.status(404).send({ message: 'Resource not found' })
      }

      const incomeResult = await prisma.transaction.aggregate({
        where: {
          userId,
          dueDate: {
            gte: startDateOfMonth,
            lte: endDateOfMonth,
          },
          type: 'INCOME',
        },
        _sum: {
          amount: true,
        },
      })

      const expenseResult = await prisma.transaction.aggregate({
        where: {
          userId,
          dueDate: {
            gte: startDateOfMonth,
            lte: endDateOfMonth,
          },
          type: 'EXPENSE',
        },
        _sum: {
          amount: true,
        },
      })

      const totalIncome = incomeResult._sum.amount || 0
      const totalExpense = expenseResult._sum.amount || 0
      const balance = totalIncome - totalExpense

      return reply.status(200).send({
        balance,
        totalExpense,
        totalIncome,
      })
    },
  )
}
