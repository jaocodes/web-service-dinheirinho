import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'

export const effectiveTransaction: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/transactions/:transactionId/effective',
    {
      onRequest: [verifyJWT],
      schema: {
        params: z.object({
          transactionId: z.string().uuid(),
        }),
        body: z.object({
          dueDate: z.coerce.date().optional(),
        }),
        response: {
          204: z.null(),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub
      const { transactionId } = request.params
      const { dueDate } = request.body


      const transaction = await prisma.transaction.findFirst({
        where: {
          userId,
          id: transactionId,
          type: { in: ['EXPENSE', 'INCOME'] },
        },
      })

      if (!transaction) {
        return reply.status(404).send({ message: 'Transaction not found' })
      }

      await prisma.transaction.update({
        data: {
          effectived: !transaction.effectived,
          dueDate,
        },
        where: {
          userId,
          id: transactionId,
        },
      })

      return reply.status(204).send()
    },
  )
}
