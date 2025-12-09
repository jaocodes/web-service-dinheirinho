import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'

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
      const databaseSchema = process.env.DATABASE_SCHEMA

      const categories = await prisma.$queryRawUnsafe<
        {
          id: number
          name: string
          type: 'EXPENSE' | 'INCOME'
          custom: boolean
        }[]
      >(`
      SELECT 
        id, 
        name, 
        type, 
        CASE 
          WHEN "userId" IS NULL THEN false 
          ELSE true 
        END as custom
      FROM ${databaseSchema}.categories
      WHERE "userId" IS NULL OR "userId" = $1
    `, userId)

      return reply.status(200).send({ categories })






    },
  )
}
