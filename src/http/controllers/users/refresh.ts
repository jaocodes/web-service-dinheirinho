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
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify({ onlyCookie: true })

      const userId = request.user.sub

      const token = await reply.jwtSign(
        {},
        {
          sign: {
            sub: userId,
          },
        },
      )

      const refreshToken = await reply.jwtSign(
        {},
        {
          sign: {
            sub: userId,
            expiresIn: '7d',
          },
        },
      )

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
