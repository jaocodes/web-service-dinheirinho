import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/prisma-client'
import { verifyJWT } from '../hooks/verify-jwt'

export const createAccountBodySchema = z.object({
  name: z.string(),
  type: z.enum(['BANK', 'WALLET']),
  initialBalance: z.coerce.number().int(),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

export const createAccount: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/accounts',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createAccountBodySchema,
        response: {
          201: z.null(),
          409: userNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { initialBalance, name, type } = request.body
      const userId = request.user.sub

      const userExists = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!userExists) {
        return reply.status(409).send({ message: 'User does not exists' })
      }

      await prisma.account.create({
        data: {
          name,
          type,
          initialBalance: initialBalance,
          userId,
        },
      })
      return reply.status(201).send()
    },
  )
}
