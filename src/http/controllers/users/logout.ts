import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

interface JwtPayload {
  jti: string // ID único do token
}

export const logout: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/sessions/logout',
    {
      schema: {
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies

      if (refreshToken) {
        try {
          const decoded = (await request.jwtVerify({
            onlyCookie: true,
          })) as JwtPayload

          await prisma.refreshToken.update({
            where: { jti: decoded.jti },
            data: { revoked: true },
          })
        } catch (error) {}
      }

      reply.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: true,
      })

      return reply.status(204).send()
    },
  )
}
