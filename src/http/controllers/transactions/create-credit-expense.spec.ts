import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import { prisma } from '@/prisma-client'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import {
  getDueDateInvoice,
  type createCreditExpenseBodySchema,
} from './create-credit-expense'

describe('(e2e) POST /transactions/credit', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a credit expense transaction', async () => {
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
        isFixed: false,
        type: 'CREDIT',
        installments: 1,
      }

      const response = await request(app.server)
        .post('/transactions/credit')
        .set('Authorization', `Bearer ${token}`)
        .send(creditExpense)

      const transactionCreated = await prisma.transaction.findFirst({
        where: { userId: userCreated.id },
      })

      expect(response.statusCode).toEqual(201)

      expect(transactionCreated?.invoiceDate?.toLocaleDateString()).toBe(
        '25/02/2025',
      )
    }
  })

  it('should be able to create a fixed credit expense transaction ', async () => {
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
        description: 'netflix',
        amount: 21.9 * 100,
        categoryId: 10,
        creditCardId: creditCard.id,
        dueDate: new Date(2025, 1, 15),
        isFixed: true,
        type: 'CREDIT',
        installments: 1,
      }

      const response = await request(app.server)
        .post('/transactions/credit')
        .set('Authorization', `Bearer ${token}`)
        .send(creditExpense)

      const transactions = await prisma.transaction.findMany({
        where: { userId: userCreated.id },
      })

      expect(response.statusCode).toEqual(201)
      expect(transactions).toHaveLength(12)

      const currentDate = new Date(2025, 1, 15)

      for (let i = 0; i < 12; i++) {
        expect(transactions[i].dueDate.toISOString()).toEqual(
          currentDate.toISOString(),
        )

        const invoiceDate = getDueDateInvoice(currentDate, 15, 25)

        expect(transactions[i].invoiceDate?.toISOString()).toEqual(
          invoiceDate.toISOString(),
        )
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }
  })

  it('should be able to create a installment credit expense transaction ', async () => {
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
        description: 'alguma coisa',
        amount: 164.52 * 100, //3*54,84
        categoryId: 10,
        creditCardId: creditCard.id,
        dueDate: new Date(2025, 1, 15),
        type: 'CREDIT',
        installments: 3,
        isFixed: false,
      }

      const response = await request(app.server)
        .post('/transactions/credit')
        .set('Authorization', `Bearer ${token}`)
        .send(creditExpense)

      const transactions = await prisma.transaction.findMany({
        where: { userId: userCreated.id },
      })

      expect(response.statusCode).toEqual(201)
      expect(transactions).toHaveLength(3)

      const currentDate = new Date(2025, 1, 15)

      for (let i = 0; i < 3; i++) {
        expect(transactions[i].dueDate.toISOString()).toEqual(
          currentDate.toISOString(),
        )

        const invoiceDate = getDueDateInvoice(currentDate, 15, 25)

        expect(transactions[i].invoiceDate?.toISOString()).toEqual(
          invoiceDate.toISOString(),
        )

        expect(transactions[i].amount).toBe(5484)
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }
  })

  it('should be able to create a installment credit expense transaction, with cents correction', async () => {
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
        description: 'alguma coisa',
        amount: 100 * 100, //2x33,33 + 1x33,34
        categoryId: 10,
        creditCardId: creditCard.id,
        dueDate: new Date(2025, 1, 15),
        type: 'CREDIT',
        installments: 3,
        isFixed: false,
      }

      const response = await request(app.server)
        .post('/transactions/credit')
        .set('Authorization', `Bearer ${token}`)
        .send(creditExpense)

      const transactions = await prisma.transaction.findMany({
        where: { userId: userCreated.id },
      })

      expect(response.statusCode).toEqual(201)
      expect(transactions).toHaveLength(3)
      expect(transactions[0].amount).toEqual(3333)
      expect(transactions[1].amount).toEqual(3333)
      expect(transactions[2].amount).toEqual(3334)
    }
  })
})
