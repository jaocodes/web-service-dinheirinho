import { prisma } from '@/prisma-client'
import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

const responseAuthenticateUserSchema = z.object({
  token: z.string(),
})

export const refresh: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/sessions/refresh',
    {
      schema: {
        response: {
          200: responseAuthenticateUserSchema,
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify({ onlyCookie: true })

      const oldJti = request.user.jti
      const userId = request.user.sub

      const dbRefreshToken = await prisma.refreshToken.findUnique({
        where: { jti: oldJti },
      })

      if (!dbRefreshToken || dbRefreshToken.revoked) {
        return reply.status(401).send({ message: 'Invalid refresh token' })
      }

      await prisma.refreshToken.update({
        where: { jti: oldJti },
        data: { revoked: true },
      })

      const token = await reply.jwtSign(
        {},
        {
          sign: { sub: userId },
        },
      )

      const newJti = randomUUID()

      const refreshToken = await reply.jwtSign(
        {},
        {
          sign: {
            sub: userId,
            jti: newJti,
            expiresIn: '7d',
          },
        },
      )

      await prisma.refreshToken.create({
        data: {
          userId,
          jti: newJti,
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
