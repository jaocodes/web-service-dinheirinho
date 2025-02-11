import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { registerUserBodySchema } from './register'
import type { z } from 'zod'

describe('(e2e) PATCH /sessions/refresh', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to refresh a token', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John+@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes',
    }

    await request(app.server).post('/users').send(user)

    const authResponse = await request(app.server).post('/sessions').send({
      email: 'John+@teste.com.br',
      password: '123456789',
    })

    const cookies = authResponse.headers['set-cookie']

    const response = await request(app.server)
      .patch('/sessions/refresh')
      .set('Cookie', cookies)
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body).toMatchObject({
      token: expect.any(String),
    })

    expect(response.headers['set-cookie'][0]).toEqual(
      expect.stringContaining('refreshToken='),
    )
  })
})
