import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { z } from 'zod'
import { prisma } from '@/prisma-client'

const fetchCreditCardsResponseSchema = z.object({
  creditCards: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      initialLimit: z.number().int(),
      currentLimit: z.number().int(),
      account: z.object({
        id: z.string().uuid(),
        name: z.string(),
      }),
    }),
  ),
})

export const fetchCreditCards: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/credit-cards',
    {
      onRequest: [verifyJWT],
      schema: {
        response: {
          200: fetchCreditCardsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub

      const creditCards = await prisma.creditCard.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          name: true,
          initialLimit: true,
          currentLimit: true,
          account: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return reply.status(200).send({ creditCards })
    },
  )
}
