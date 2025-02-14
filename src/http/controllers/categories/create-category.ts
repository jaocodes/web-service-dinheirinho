import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'

const createCategoryBodySchema = z.object({
  name: z
    .string()
    .transform(
      (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(),
    ),
  type: z.enum(['EXPENSE', 'INCOME']),
})

const createCategoryConflitResponse = z.object({
  message: z.string(),
})

export const createCategory: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/category',
    {
      onRequest: [verifyJWT],
      schema: {
        body: createCategoryBodySchema,
        response: {
          201: z.null(),
          409: createCategoryConflitResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub
      const { name, type } = request.body

      const categoryExists = await prisma.category.findFirst({
        where: {
          userId,
          name,
          type,
        },
      })

      if (categoryExists) {
        return reply
          .status(409)
          .send({ message: 'Conflit, resource already exists' })
      }

      await prisma.category.create({
        data: { name, type, userId },
      })

      return reply.status(201).send()
    },
  )
}
