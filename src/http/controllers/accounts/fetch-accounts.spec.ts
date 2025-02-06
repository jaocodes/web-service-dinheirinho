import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import type { createAccountBodySchema } from './create-account'
import type { registerUserBodySchema } from '../users/register'
import { prisma } from '@/prisma-client'

describe('(e2e) GET /account/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to fetch accounts by userId', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes',
    }

    await request(app.server).post('/users').send(user)

    const userCreated = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (userCreated) {
      const account: z.infer<typeof createAccountBodySchema> = {
        name: 'Conta roxa',
        initialBalance: 1000,
        type: 'BANK',
        userId: userCreated.id,
      }
      const account2: z.infer<typeof createAccountBodySchema> = {
        name: 'Conta verde',
        initialBalance: 2000,
        type: 'BANK',
        userId: userCreated.id,
      }

      await request(app.server).post('/accounts').send(account)
      await request(app.server).post('/accounts').send(account2)

      const response = await request(app.server)
        .get(`/accounts/${userCreated.id}`)
        .send()

      expect(response.body.accounts).toHaveLength(2)
    }
  })
})
