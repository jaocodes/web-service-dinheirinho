import { prisma } from '@/prisma-client'
import { endOfMonth, startOfMonth } from 'date-fns'
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
  totalAmountAccountsType: z.enum([
    'SALDO_ATÉ_O_FIM_DO_MÊS',
    'SALDO_ATUAL_EM_CONTAS',
    'SALDO_PREVISTO',
  ]),
  totalAmountAccounts: z.number().int(),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

function defineTotalAmountAccountsType(
  endDateOfMonth: Date,
): Pick<z.infer<typeof transactionsResponseSchema>, 'totalAmountAccountsType'> {
  if (endDateOfMonth.getMonth() === new Date().getMonth()) {
    return { totalAmountAccountsType: 'SALDO_ATUAL_EM_CONTAS' }
  }
  if (endDateOfMonth.getMonth() < new Date().getMonth()) {
    return { totalAmountAccountsType: 'SALDO_ATÉ_O_FIM_DO_MÊS' }
  }

  return { totalAmountAccountsType: 'SALDO_PREVISTO' }
}
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
      const startDateOfMonth = startOfMonth(
        new Date(`${month}-01T03:00:00.000Z`),
      )
      const endDateOfMonth = endOfMonth(startDateOfMonth)

      const isCurrentOrPastMonth =
        endDateOfMonth.getMonth() <= new Date().getMonth()

      const incomesAmountTransactions = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'INCOME',
          dueDate: {
            lte: endDateOfMonth,
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
            lte: endDateOfMonth,
          },
          effectived: isCurrentOrPastMonth ? true : undefined,
        },
      })

      const incomes = incomesAmountTransactions._sum.amount || 0
      const expenses = expensesAmountTransactions._sum.amount || 0
      const balance = incomes - expenses

      const totalAmountAccountsAggregate = await prisma.account.aggregate({
        _sum: {
          initialBalance: true,
        },
        where: {
          userId,
        },
      })

      const { totalAmountAccountsType } =
        defineTotalAmountAccountsType(endDateOfMonth)

      const totalAmmountAcounts =
        totalAmountAccountsAggregate._sum.initialBalance || 0

      return reply.status(200).send({
        totalAmountAccountsType,
        totalAmountAccounts: totalAmmountAcounts + balance,
      })
    },
  )
}
