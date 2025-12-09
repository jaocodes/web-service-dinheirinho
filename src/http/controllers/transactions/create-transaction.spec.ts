import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { buildApp } from '@/app'
import { prisma } from '@/prisma-client'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeUser } from 'test/factories/makeUser'
import type { z } from 'zod'
import type { createTransactionBodySchema } from './create-transaction'

const app = buildApp()

describe('(e2e) POST /transactions', () => {
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

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      accountId: account.id,
      amount: 25 * 100,
      description: 'despesa de 25 reais',
      dueDate: new Date(2025, 1, 6),
      type: 'EXPENSE',
      categoryId: 14,
      observations: 'apenas uma observação',
    }

    const response = await request(app.server)
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: userCreated.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('despesa de 25 reais')
    expect(transactionCreated?.effectived).toEqual(false)
  })

  it('should be able to create a done transaction', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 200 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      accountId: account.id,
      amount: 100 * 100,
      description: 'ganho de 100 reais',
      dueDate: new Date(2025, 1, 6),
      type: 'INCOME',
      categoryId: 1,
      observations: 'apenas uma observação',
      effectived: true,
    }

    const response = await request(app.server)
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: userCreated.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('ganho de 100 reais')
    expect(transactionCreated?.effectived).toEqual(true)
  })

  it('should be able to create a transaction fixed', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      accountId: account.id,
      amount: 25 * 100,
      description: 'salário de 500 reais',
      dueDate: new Date(2025, 1, 20),
      type: 'INCOME',
      categoryId: 1,
      observations: 'apenas uma observação',
      isFixed: true,
    }

    const response = await request(app.server)
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction)

    const transactionsCreated = await prisma.transaction.findMany({
      where: { userId: userCreated.id },
      orderBy: { dueDate: 'asc' },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionsCreated).toHaveLength(12)

    const currentDate = new Date(transaction.dueDate)

    for (let i = 0; i < 12; i++) {
      expect(transactionsCreated[i].dueDate.toISOString()).toEqual(
        currentDate.toISOString(),
      )
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
  })

  it('should be able to create a recurring transaction', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      accountId: account.id,
      amount: 30 * 100,
      description: 'emprestimo',
      dueDate: new Date(2025, 0, 31),
      type: 'EXPENSE',
      categoryId: 14,
      observations: 'apenas uma observação',
      isRecurring: true,
      recurringFor: 3,
    }

    const response = await request(app.server)
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction)

    const transactionsCreated = await prisma.transaction.findMany({
      where: { userId: userCreated.id },
      orderBy: { dueDate: 'asc' },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionsCreated).toHaveLength(3)

    const currentDate = new Date(transaction.dueDate)

    for (let i = 0; i < 3; i++) {
      expect(transactionsCreated[i].dueDate.toISOString()).toEqual(
        currentDate.toISOString(),
      )

      currentDate.setMonth(currentDate.getMonth() + 1)
    }
  })
})
