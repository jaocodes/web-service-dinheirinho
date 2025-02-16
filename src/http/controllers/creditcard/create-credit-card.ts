import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { prisma } from '@/prisma-client'
import { z } from 'zod'

const createCreditCardBodySchema = z.object({
  name: z.string(),
  accountId: z.string().uuid(),
  closingDay: z.coerce.number().int().min(1).max(30),
  dueDay: z.coerce.number().int().min(1).max(30),
  limit: z.coerce.number().int(),
})

export const createCreditCard: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/credit-card',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createCreditCardBodySchema,
        response: {
          201: z.null(),
          409: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub
      const { accountId, name, limit, closingDay, dueDay } = request.body

      const accountExists = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId,
        },
      })

      if (!accountExists) {
        return reply
          .status(409)
          .send({
            message:
              'Não é possível criar em uma conta que não pertence ao usuário',
          })
      }

      await prisma.creditCard.create({
        data: {
          userId,
          accountId,
          closingDay,
          dueDay,
          limit,
          name,
        },
      })

      return reply.status(201).send()
    },
  )
}
