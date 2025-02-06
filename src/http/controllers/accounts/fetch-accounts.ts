import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'

export const fetchAccountsParamsSchema = z.object({
  userId: z.string().uuid(),
})

const accountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['BANK', 'WALLET']),
      currentBalance: z.number().int(),
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
      schema: {
        params: fetchAccountsParamsSchema,
        response: {
          200: accountsResponseSchema,
          409: userNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!userExists) {
        return reply.status(409).send({ message: 'User does not exists' })
      }

      const accounts = await prisma.account.findMany({
        where: {
          userId,
        },
        select: {
          currentBalance: true,
          name: true,
          id: true,
          type: true,
        },
      })

      return reply.status(200).send({ accounts })
    },
  )
}
