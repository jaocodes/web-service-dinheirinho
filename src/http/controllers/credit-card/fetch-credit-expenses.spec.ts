import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
  vi,
} from 'bun:test'
import { buildApp } from '@/app'
import { prisma } from '@/prisma-client'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeUser } from 'test/factories/makeUser'
import type { z } from 'zod'
import type { createCreditExpenseBodySchema } from '../transactions/create-credit-expense'

const app = buildApp()

describe('(e2e) GET /transactions/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })
  beforeEach(async () => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  it('should be able to fetch all expenses from creditCard', async () => {
    setSystemTime(new Date(2025, 1, 4, 10, 0, 0))

    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    const creditCardRoxinho = await prisma.creditCard.create({
      data: {
        userId: userCreated.id,
        accountId: account.id,
        name: 'Roxinho',
        closingDay: 5,
        dueDay: 15,
        currentLimit: 200 * 100,
        initialLimit: 200 * 100,
      },
    })

    const creditExpenseOnRoxinho: z.infer<
      typeof createCreditExpenseBodySchema
    > = {
      description: 'gasolina',
      amount: 20 * 100,
      categoryId: 8,
      creditCardId: creditCardRoxinho.id,
      dueDate: new Date(2025, 1, 4),
      isFixed: false,
      type: 'CREDIT',
      installments: 1,
    }

    await request(app.server)
      .post('/transactions/credit')
      .set('Authorization', `Bearer ${token}`)
      .send(creditExpenseOnRoxinho)

    const creditFixedExpenseOnRoxinho: z.infer<
      typeof createCreditExpenseBodySchema
    > = {
      description: 'netflix',
      amount: 21.9 * 100,
      categoryId: 10,
      creditCardId: creditCardRoxinho.id,
      dueDate: new Date(2025, 1, 5),
      isFixed: true,
      type: 'CREDIT',
      installments: 1,
    }

    await request(app.server)
      .post('/transactions/credit')
      .set('Authorization', `Bearer ${token}`)
      .send(creditFixedExpenseOnRoxinho)

    const response = await request(app.server)
      .get(`/credit-cards/${creditCardRoxinho.id}/invoice`)
      .query({ month: '2025-02' })
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(response.status).toEqual(200)
  })
})
