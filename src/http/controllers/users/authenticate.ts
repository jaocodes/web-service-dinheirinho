import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/prisma-client'

export const authenticateBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})

const credentialsInvalidResponse = z.object({
  message: z.string(),
})

export const AuthenticateUser: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sessions',
    {
      schema: {
        body: authenticateBodySchema,
        response: {
          200: z.null(),
          400: credentialsInvalidResponse,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const userExists = await prisma.user.findUnique({
        where: {
          email,
        },
      })

      if (!userExists) {
        return reply.status(400).send({ message: 'Credentials invalid' })
      }

      const doesPasswordMatches = await bcryptjs.compare(
        password,
        userExists.password,
      )

      if (!doesPasswordMatches) {
        return reply.status(400).send({ message: 'Credentials invalid' })
      }

      return reply.status(200).send()
    },
  )
}
