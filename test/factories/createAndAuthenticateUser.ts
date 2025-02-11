import { prisma } from '@/prisma-client'
import { hash } from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import request from 'supertest'
export async function createAndAuthenticateUser(app: FastifyInstance) {
  const userCreated = await prisma.user.create({
    data: {
      firstName: 'john',
      lastName: 'doe',
      email: 'johndoe@example.com',
      password: await hash('12345678910', 6),
      username: 'johndoe',
    },
  })

  const responseAuthenticate = await request(app.server)
    .post('/sessions')
    .send({
      email: 'johndoe@example.com',
      password: '12345678910',
    })

  const { token } = responseAuthenticate.body

  return { token, userCreated }
}
