import { prisma } from '@/prisma-client'
import { endOfMonth, startOfMonth } from 'date-fns'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'

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
export const getTotalAmount: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/totalAmount/:userId',
    {
      onRequest: [verifyJWT],
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

      const accountsWithBalance = await prisma.$queryRaw<
        { id: string; balance: number }[]
      >`
        SELECT 
          a.id,
          (a."initialBalance" +
            COALESCE(SUM(
              CASE
                WHEN (
                  t.type = 'INCOME' AND 
                  t."dueDate" <= ${endDateOfMonth} AND 
                  (${isCurrentOrPastMonth} = false OR t.effectived = true)
                ) THEN t.amount
                WHEN (
                  t.type = 'EXPENSE' AND 
                  t."dueDate" <= ${endDateOfMonth} AND 
                  (${isCurrentOrPastMonth} = false OR t.effectived = true)
                ) THEN -t.amount
                ELSE 0
              END
            ), 0))::integer as balance
        FROM "accounts" a
        LEFT JOIN "transactions" t 
          ON t."accountId" = a.id
        WHERE a."userId" = ${userId}
        GROUP BY a.id
      `

      const totalAmountAccounts = accountsWithBalance.reduce(
        (sum, account) => sum + account.balance,
        0,
      )

      const { totalAmountAccountsType } =
        defineTotalAmountAccountsType(endDateOfMonth)

      return reply.status(200).send({
        totalAmountAccountsType,
        totalAmountAccounts,
      })
    },
  )
}
