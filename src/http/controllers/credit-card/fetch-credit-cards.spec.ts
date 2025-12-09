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
import { fetchCreditCardsResponseSchema } from './fetch-credit-cards'

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

  it('should be able to fetch creditCards', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    const [creditCardRoxinho, creditCardVerdinho] =
      await prisma.creditCard.createManyAndReturn({
        data: [
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Roxinho',
            closingDay: 5,
            dueDay: 15,
            currentLimit: 200 * 100,
            initialLimit: 200 * 100,
          },
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Verdinho',
            closingDay: 10,
            dueDay: 25,
            currentLimit: 100 * 100,
            initialLimit: 100 * 100,
          },
        ],
      })

    const response = await request(app.server)
      .get('/credit-cards')
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.creditCards).toHaveLength(2)
  })

  it('should be able to fetch creditCards with opened and closed invoices', async () => {
    setSystemTime(new Date(2025, 1, 5, 10, 0, 0))

    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    const [creditCardRoxinho, creditCardVerdinho] =
      await prisma.creditCard.createManyAndReturn({
        data: [
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Roxinho',
            closingDay: 5,
            dueDay: 15,
            currentLimit: 200 * 100,
            initialLimit: 200 * 100,
          },
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Verdinho',
            closingDay: 10,
            dueDay: 25,
            currentLimit: 100 * 100,
            initialLimit: 100 * 100,
          },
        ],
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
      .get('/credit-cards')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const data = fetchCreditCardsResponseSchema.parse(response.body)

    const roxinhoResponse = data.creditCards.find((c) => c.name === 'Roxinho')

    expect(response.status).toEqual(200)
    expect(response.body.creditCards).toHaveLength(2)
    expect(roxinhoResponse?.openedInvoiceAmount).toEqual(4190)
  })
})
