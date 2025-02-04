import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import type { createAccountBodySchema } from './create-account'
import type { registerUserBodySchema } from '../users/register'
import { prisma } from '@/prisma-client'

describe('(e2e) POST /account', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create an account', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John+@teste.com.br',
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
        balance: 1000,
        type: 'BANK',
        userId: userCreated.id,
      }

      const response = await request(app.server).post('/accounts').send(account)

      expect(response.statusCode).toEqual(201)
    }

    const accountCreated = await prisma.account.findFirst({
      where: { name: 'Conta roxa' },
    })

    expect(accountCreated?.id).toEqual(expect.any(String))
  })
})
