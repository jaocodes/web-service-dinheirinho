import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { prisma } from '@/prisma-client'

const fetchCategoriesResponseSchema = z.object({
  categories: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER_IN', 'TRANSFER_OUT']),
      custom: z.boolean(),
    }),
  ),
})

export const fetchCategories: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/category',
    {
      onRequest: [verifyJWT],
      schema: {
        response: {
          200: fetchCategoriesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub

      const categories = await prisma.$queryRaw<
        {
          id: number
          name: string
          type: 'EXPENSE' | 'INCOME'
          custom: boolean
        }[]
      >`
      SELECT 
        id, 
        name, 
        type, 
        CASE 
          WHEN "userId" IS NULL THEN false 
          ELSE true 
        END as custom
      FROM categories
      WHERE "userId" IS NULL OR "userId" = ${userId}
    `

      return reply.status(200).send({ categories })
    },
  )
}
