import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import { prisma } from '@/prisma-client'
import type { createTransactionBodySchema } from './create-transaction'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'

describe('(e2e) POST /transactions', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a transaction not done', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 125 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 25 * 100,
      description: 'despesa de 25 reais',
      dueDate: new Date(2025, 1, 6),
      type: 'EXPENSE',
      observations: 'apenas uma observação',
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: user.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('despesa de 25 reais')
    expect(transactionCreated?.effectived).toEqual(false)
  })

  it('should be able to create a done transaction and update the amount of account', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 200 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 100 * 100,
      description: 'ganho de 100 reais',
      dueDate: new Date(2025, 1, 6),
      type: 'INCOME',
      observations: 'apenas uma observação',
      effectived: true,
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: user.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('ganho de 100 reais')
    expect(transactionCreated?.effectived).toEqual(true)

    const accountAfterUpdate = await prisma.account.findUnique({
      where: {
        id: account.id,
      },
    })

    expect(accountAfterUpdate?.currentBalance).toEqual(300 * 100)
  })

  it('should be able to create a transaction fixed', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 125 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 25 * 100,
      description: 'salário de 500 reais',
      dueDate: new Date(2025, 1, 20),
      type: 'INCOME',
      observations: 'apenas uma observação',
      isFixed: true,
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionsCreated = await prisma.transaction.findMany({
      where: { userId: user.id },
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
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 125 * 100,
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 30 * 100,
      description: 'emprestimo',
      dueDate: new Date(2025, 0, 31),
      type: 'EXPENSE',
      observations: 'apenas uma observação',
      isRecurring: true,
      recurringFor: 3,
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionsCreated = await prisma.transaction.findMany({
      where: { userId: user.id },
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
