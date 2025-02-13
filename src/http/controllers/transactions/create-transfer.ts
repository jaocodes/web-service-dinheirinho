import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'

export const createTransferBodySchema = z.object({
  amount: z.coerce.number().int(),
  sourceAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  observations: z.string().optional(),
  dueDate: z.coerce.date(),
})

const userOrAccountNotFoundResponse = z.object({
  message: z.string(),
})

export const createTranfer: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transfer',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createTransferBodySchema,
        response: {
          201: z.null(),
          409: userOrAccountNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const {
        sourceAccountId,
        targetAccountId,
        amount,
        dueDate,
        observations,
      } = request.body

      const userId = request.user.sub

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      const accounts = await prisma.account.findMany({
        where: {
          id: {
            in: [sourceAccountId, targetAccountId],
          },
        },
      })

      if (!user || accounts.length !== 2) {
        return reply.status(409).send({ message: 'User or account not found' })
      }

      if (dueDate > new Date()) {
        return reply.status(400).send({
          message: 'Transferencias nao podem ser cadastradas no futuro',
        })
      }

      const transferId = randomUUID()

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            userId,
            amount,
            dueDate,
            observations,
            transferId,
            effectived: true,
            accountId: sourceAccountId,
            type: 'TRANSFER_OUT',
            targetAccountId: targetAccountId,
            description: 'Transferência saída',
          },
        }),

        prisma.transaction.create({
          data: {
            userId,
            amount,
            dueDate,
            observations,
            transferId,
            effectived: true,
            accountId: targetAccountId,
            type: 'TRANSFER_IN',
            targetAccountId: sourceAccountId,
            description: 'Transferência entrada',
          },
        }),
      ])

      return reply.status(201).send()
    },
  )
}
