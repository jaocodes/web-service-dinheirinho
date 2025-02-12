import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/prisma-client'
import { randomUUID } from 'node:crypto'

export const authenticateBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})

const credentialsInvalidResponse = z.object({
  message: z.string(),
})

const responseAuthenticateUserSchema = z.object({
  token: z.string(),
})

export const authenticateUser: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sessions',
    {
      schema: {
        body: authenticateBodySchema,
        response: {
          200: responseAuthenticateUserSchema,
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

      const token = await reply.jwtSign(
        {},
        {
          sign: { sub: userExists.id },
        },
      )

      const jti = randomUUID()

      const refreshToken = await reply.jwtSign(
        {},
        {
          sign: { sub: userExists.id, jti, expiresIn: '7d' },
        },
      )

      await prisma.refreshToken.create({
        data: {
          userId: userExists.id,
          jti,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return reply
        .status(200)
        .setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: true,
        })
        .send({ token })
    },
  )
}
