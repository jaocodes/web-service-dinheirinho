import type { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import request from 'supertest'

export async function authenticateUser(
  app: FastifyInstance,
  userInput: Prisma.UserCreateInput,
) {
  const responseAuthenticate = await request(app.server)
    .post('/sessions')
    .send({
      email: userInput.email,
      password: userInput.password,
    })

  const { token } = responseAuthenticate.body

  return { token }
}
