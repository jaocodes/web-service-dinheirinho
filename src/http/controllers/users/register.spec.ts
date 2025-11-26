import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { app } from '@/app'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase } from 'test/db-setup'
import type { z } from 'zod'
import type { registerUserBodySchema } from './register'

describe('(e2e) POST /register', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    await app.ready()

  })

  afterAll(async () => {
    await teardownTestDatabase()
    await app.close()

  })

  it('should be able to register a new user', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John+@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes',
    }

    const response = await request(app.server).post('/users').send(user)

    expect(response.statusCode).toEqual(201)
  })
})
