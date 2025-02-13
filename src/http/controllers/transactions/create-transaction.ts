import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'
import { randomUUID } from 'node:crypto'
import { verifyJWT } from '../hooks/verify-jwt'

export const createTransactionBodySchema = z.object({
  accountId: z.string().uuid(),
  description: z.string(),
  observations: z.string().optional(),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().int(),
  effectived: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  isFixed: z.coerce.boolean().optional(),
  dueDate: z.coerce.date(),
  recurringFor: z.coerce.number().int().optional(),
})

const userOrAccountNotFoundResponse = z.object({
  message: z.string(),
})

export const createTransaction: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transactions',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createTransactionBodySchema,
        response: {
          201: z.null(),
          400: z.object({ message: z.string() }),
          409: userOrAccountNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const {
        accountId,
        description,
        type,
        amount,
        dueDate,
        observations,
        effectived,
        isFixed,
        isRecurring,
        recurringFor,
      } = request.body

      const userId = request.user.sub

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

      if (effectived && dueDate > new Date()) {
        return reply.status(400).send({
          message:
            'Transações efetivadas devem ter uma data de vencimento igual ou anterior à data atual.',
        })
      }

      if (isFixed) {
        const fixedId = randomUUID()

        const transactionsToCreate = []

        const currentDate = new Date(dueDate)

        for (let index = 0; index < 12; index++) {
          transactionsToCreate.push({
            userId,
            accountId,
            type,
            amount,
            dueDate: new Date(currentDate),
            description,
            isFixed,
            fixedId,
            observations,
          })
          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        await prisma.transaction.createMany({ data: transactionsToCreate })
        return reply.status(201).send()
      }

      if (isRecurring && recurringFor) {
        const recurrenceId = randomUUID()

        const transactionsToCreate = []

        const currentDate = new Date(dueDate)

        for (let index = 0; index < recurringFor; index++) {
          transactionsToCreate.push({
            userId,
            accountId,
            type,
            amount,
            dueDate: new Date(currentDate),
            description,
            isRecurring,
            recurrenceId,
            observations,
          })
          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        await prisma.transaction.createMany({ data: transactionsToCreate })
        return reply.status(201).send()
      }

      await prisma.transaction.create({
        data: {
          userId,
          accountId,
          type,
          amount,
          dueDate,
          description,
          effectived,
          observations,
        },
      })

      return reply.status(201).send()
    },
  )
}
