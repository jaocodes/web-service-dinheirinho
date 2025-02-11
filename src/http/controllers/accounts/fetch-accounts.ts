import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'
import { endOfMonth, startOfMonth } from 'date-fns'
import { verifyJWT } from '../hooks/verify-jwt'

export const fetchAccountsParamsSchema = z.object({
  userId: z.string().uuid(),
})

export const fetchAccountsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

export const accountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['BANK', 'WALLET']),
      currentTotalAmount: z.number().int(),
      expectedTotalAmount: z.number().int(),
    }),
  ),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

export const fetchAccounts: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/accounts/:userId',
    {
      onRequest: [verifyJWT],
      schema: {
        params: fetchAccountsParamsSchema,
        querystring: fetchAccountsQuerySchema,
        response: {
          200: accountsResponseSchema,
          409: userNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params
      const { month } = request.query

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!userExists) {
        return reply.status(409).send({ message: 'User does not exists' })
      }

      const startDateOfMonth = startOfMonth(
        new Date(`${month}-01T03:00:00.000Z`),
      )
      const endDateOfMonth = endOfMonth(startDateOfMonth)

      const accounts = await prisma.$queryRaw<
        {
          id: string
          name: string
          type: 'BANK' | 'WALLET'
          currentTotalAmount: number
          expectedTotalAmount: number
        }[]
      >`
      SELECT 
        a.id,
        a.name,
        a.type,
        (a."initialBalance" + 
          COALESCE(SUM(
            CASE
              WHEN (
                (t.type = 'INCOME' AND t.effectived = true AND t."accountId" = a.id) OR
                (t.type = 'TRANSFER_IN' AND t.effectived = true AND t."accountId" = a.id)
              ) THEN t.amount
              WHEN (
                (t.type IN ('EXPENSE', 'TRANSFER_OUT') AND t.effectived = true AND t."accountId" = a.id)
              ) THEN -t.amount
              ELSE 0
            END
          ), 0))::integer as "currentTotalAmount",
        (a."initialBalance" + 
          COALESCE(SUM(
            CASE
              WHEN (
                (t.type = 'INCOME' AND t."dueDate" <= ${endDateOfMonth} AND t."accountId" = a.id) OR
                (t.type = 'TRANSFER_IN' AND t."dueDate" <= ${endDateOfMonth} AND t."accountId" = a.id)
              ) THEN t.amount
              WHEN (
                (t.type IN ('EXPENSE', 'TRANSFER_OUT') AND t."dueDate" <= ${endDateOfMonth} AND t."accountId" = a.id)
              ) THEN -t.amount
              ELSE 0
            END
          ), 0))::integer as "expectedTotalAmount"
      FROM "accounts" a
      LEFT JOIN "transactions" t 
        ON t."accountId" = a.id 
      WHERE a."userId" = ${userId}
      GROUP BY a.id
      ORDER BY a."createdAt" ASC
    `

      return reply.status(200).send({
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          currentTotalAmount: account.currentTotalAmount,
          expectedTotalAmount: account.expectedTotalAmount,
        })),
      })
    },
  )
}
