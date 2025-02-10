import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { registerUserBodySchema } from './register'
import { prisma } from '@/prisma-client'
import type { z } from 'zod'

describe('(e2e) POST /', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to autenticate and receive token and refreshToken', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John+@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes',
    }

    await request(app.server).post('/users').send(user)

    const response = await request(app.server).post('/sessions').send({
      email: 'John+@teste.com.br',
      password: '123456789',
    })

    const userCreatedId = await prisma.user.findUnique({
      where: {
        email: 'John+@teste.com.br',
      },
      select: {
        id: true,
      },
    })

    expect(response.statusCode).toEqual(200)
    expect(response.body).toMatchObject({
      token: expect.any(String),
    })

    const tokenDecode = app.jwt.decode(response.body.token) as { exp: number }

    expect(tokenDecode).toMatchObject({
      sub: userCreatedId?.id,
      iat: expect.any(Number),
      exp: expect.any(Number),
    })

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = tokenDecode?.exp - now

    expect(expiresIn).toBeGreaterThan(0)
    expect(expiresIn).toBeLessThanOrEqual(600) //10 minutos

    const setCookieHeader = response.headers['set-cookie']
    expect(setCookieHeader).toBeDefined()

    expect(setCookieHeader[0]).toMatch(/HttpOnly/)
    expect(setCookieHeader[0]).toMatch(/refreshToken/)
  })
})
