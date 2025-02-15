import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import { prisma } from '@/prisma-client'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import type { createCreditExpenseBodySchema } from './create-credit-expense'

describe('(e2e) POST /transactions/credit', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a transaction not done', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100,
    })

    await request(app.server)
      .post('/credit-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cartão 01',
        accountId: account.id,
        closingDay: 15,
        dueDay: 25,
        limit: 50000,
      })

    const creditCard = await prisma.creditCard.findFirst({
      where: {
        userId: userCreated.id,
      },
    })

    if (creditCard) {
      const creditExpense: z.infer<typeof createCreditExpenseBodySchema> = {
        description: 'gasolina',
        amount: 20 * 100,
        categoryId: 8,
        creditCardId: creditCard.id,
        dueDate: new Date(2025, 1, 15),
        type: 'CREDIT',
        isFixed: false,
      }

      const response = await request(app.server)
        .post('/transactions/credit')
        .set('Authorization', `Bearer ${token}`)
        .send(creditExpense)

      const transactionCreated = await prisma.transaction.findFirst({
        where: { userId: userCreated.id },
      })

      expect(response.statusCode).toEqual(201)
      expect(transactionCreated?.invoiceDate).toBeDefined()
    }
  })
})
