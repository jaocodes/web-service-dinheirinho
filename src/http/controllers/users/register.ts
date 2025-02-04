import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/prisma-client'

export const registerUserBodySchema = z.object({
  firstName: z.string().min(3, 'First name must be at least 3 characters long'),
  lastName: z.string().min(3, 'First name must be at least 3 characters long'),
  email: z.string().email(),
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})

const userAlreadyExistsResponse = z.object({
  message: z.string(),
})

export const registerUser: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/users',
    {
      schema: {
        body: registerUserBodySchema,
        response: {
          201: z.null(),
          409: userAlreadyExistsResponse,
        },
      },
    },
    async (request, reply) => {
      const { username, password, email, firstName, lastName } = request.body

      const userExists = await prisma.user.findUnique({
        where: {
          username,
        },
      })

      if (userExists) {
        return reply.status(409).send({ message: 'User already exists' })
      }

      const hashPassword = await bcryptjs.hash(password, 6)

      await prisma.user.create({
        data: {
          username,
          firstName,
          lastName,
          email,
          password: hashPassword,
        },
      })
      return reply.status(201).send()
    },
  )
}
