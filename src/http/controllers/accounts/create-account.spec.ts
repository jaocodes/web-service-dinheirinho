import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import type { createAccountBodySchema } from './create-account'
import { prisma } from '@/prisma-client'
import { authenticateUser } from 'test/factories/authenticateUser'
import { makeUser } from 'test/factories/makeUser'

describe('(e2e) POST /account', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create an account', async () => {
    const { userInput, userCreated } = await makeUser()

    const { token } = await authenticateUser(app, userInput)

    if (userCreated) {
      const account: z.infer<typeof createAccountBodySchema> = {
        name: 'Conta roxa',
        initialBalance: 1000,
        type: 'BANK',
        userId: userCreated.id,
      }

      const response = await request(app.server)
        .post('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send(account)

      expect(response.statusCode).toEqual(201)
    }

    const accountCreated = await prisma.account.findFirst({
      where: { name: 'Conta roxa' },
    })

    expect(accountCreated?.id).toEqual(expect.any(String))
  })
})
