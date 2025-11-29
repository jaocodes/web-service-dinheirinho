import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { app } from '@/app'
import { prisma } from '@/prisma-client'
import request from 'supertest'
import type { z } from 'zod'
import type { registerUserBodySchema } from './register'

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

    console.log(response.body)

    const userCreatedId = await prisma.user.findUnique({
      where: {
        email: 'John+@teste.com.br',
      },
      select: {
        id: true,
      },
    })

    expect(response.statusCode).toEqual(200)
    expect(typeof response.body.token).toBe('string');

    const tokenDecode = app.jwt.decode(response.body.token) as {
      exp: number;
      iat: number;
      sub: string;
    }

    expect(typeof tokenDecode.exp).toBe('number');
    expect(typeof tokenDecode.iat).toBe('number');
    if (userCreatedId) expect(tokenDecode.sub).toBe(userCreatedId.id);


    const now = Math.floor(Date.now() / 1000)
    const expiresIn = tokenDecode.exp - now

    expect(expiresIn).toBeGreaterThan(0)
    expect(expiresIn).toBeLessThanOrEqual(600)

    const setCookieHeader = response.headers['set-cookie']
    expect(setCookieHeader).toBeDefined()

    expect(setCookieHeader[0]).toMatch(/HttpOnly/)
    expect(setCookieHeader[0]).toMatch(/refreshToken/)
  })
})
