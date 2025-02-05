import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'

export const createTransactionBodySchema = z.object({
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().int(),
  dueDate: z.coerce.date(),
  effectiveDate: z.coerce.date().optional(),
})

const userOrAccountNotFoundResponse = z.object({
  message: z.string(),
})

export const createTransaction: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transactions',
    {
      schema: {
        body: createTransactionBodySchema,
        response: {
          201: z.null(),
          409: userOrAccountNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const {
        userId,
        accountId,
        title,
        description,
        type,
        amount,
        dueDate,
        effectiveDate,
      } = request.body

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      const accountExists = await prisma.account.findUnique({
        where: {
          id: accountId,
        },
      })

      if (!userExists || !accountExists) {
        return reply.status(409).send({ message: 'User or account invalid' })
      }

      await prisma.transaction.create({
        data: {
          userId,
          accountId,
          title,
          type,
          amount,
          dueDate,
          description,
          effectiveDate,
        },
      })

      return reply.status(201).send()
    },
  )
}
