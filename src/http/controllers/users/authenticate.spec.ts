import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import type { registerUserBodySchema } from './register'

describe('(e2e) POST /', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to autenticate', async () => {
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

    expect(response.statusCode).toEqual(200)
  })
})
