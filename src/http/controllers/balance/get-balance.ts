import { prisma } from '@/prisma-client'
import { endOfMonth } from 'date-fns'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const fetchTransactionParamsSchema = z.object({
  userId: z.string().uuid(),
})

const fetchTransactionQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

const transactionsResponseSchema = z.object({
  incomes: z.number().int(),
  expenses: z.number().int(),
  balance: z.number().int(),
  typeBalance: z.enum(['CURRENT_BALANCE', 'PROJECTED_BALANCE']),
  totalAmmountAcounts: z.number().int(),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

export const getBalance: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/balance/:userId',
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

      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user) {
        return reply.status(409).send({ message: 'User not exist' })
      }

      const date = new Date(`${month}-01T12:00:00.000Z`) //constroi uma data válida no mês informado, data em UTC

      const dateEnd = endOfMonth(date) // controi uma data que representa o ultimo dia no último milisegundo em UTC

      const isCurrentOrPastMonth = dateEnd.getMonth() <= new Date().getMonth() // compara se a data informada é do mês atual, pois dependendo do caso dispara regras de negocio diferentes

      const incomesAmountTransactions = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'INCOME',
          dueDate: {
            lte: dateEnd,
          },
          effectived: isCurrentOrPastMonth ? true : undefined,
        },
      })

      const expensesAmountTransactions = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'EXPENSE',
          dueDate: {
            lte: dateEnd,
          },
          effectived: isCurrentOrPastMonth ? true : undefined,
        },
      })

      const totalAmountAccountsAggregate = await prisma.account.aggregate({
        _sum: {
          initialBalance: true,
        },
        where: {
          userId,
        },
      })

      const incomes = incomesAmountTransactions._sum.amount || 0
      const expenses = expensesAmountTransactions._sum.amount || 0
      const balance = incomes - expenses

      const typeBalance = isCurrentOrPastMonth
        ? 'CURRENT_BALANCE'
        : 'PROJECTED_BALANCE'

      const totalAmmountAcounts =
        totalAmountAccountsAggregate._sum.initialBalance || 0

      return reply.status(200).send({
        incomes,
        expenses,
        balance,
        typeBalance,
        totalAmmountAcounts: totalAmmountAcounts + balance,
      })
    },
  )
}
