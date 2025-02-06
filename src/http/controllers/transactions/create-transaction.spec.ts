import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import type { registerUserBodySchema } from '../users/register'
import { prisma } from '@/prisma-client'
import type { createAccountBodySchema } from '../accounts/create-account'
import type { createTransactionBodySchema } from './create-transaction'

describe('(e2e) POST /transactions', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a transaction only', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'John+@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes',
    }

    const userCreated = await prisma.user.create({ data: user })

    const account: z.infer<typeof createAccountBodySchema> = {
      name: 'Conta roxa',
      initialBalance: 1000,
      type: 'BANK',
      userId: userCreated.id,
    }

    const accountCreated = await prisma.account.create({ data: account })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: userCreated.id,
      accountId: accountCreated.id,
      description: 'descrição de despesa',
      type: 'EXPENSE',
      amount: 18000,
      dueDate: new Date('2025-02-06T02:25:16.259Z'),
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: userCreated.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('descrição de despesa')
  })

  it('should be able to create a effectived transaction and update the amount of account', async () => {
    const user: z.infer<typeof registerUserBodySchema> = {
      firstName: 'John',
      email: 'jaocodes@teste.com.br',
      lastName: 'Does',
      password: '123456789',
      username: 'jaocodes2',
    }

    const userCreated = await prisma.user.create({ data: user })

    const account: z.infer<typeof createAccountBodySchema> = {
      name: 'Conta verde',
      initialBalance: 1000,
      type: 'BANK',
      userId: userCreated.id,
    }

    const accountCreated = await prisma.account.create({
      data: { ...account, currentBalance: account.initialBalance },
    })

    const transaction: z.infer<typeof createTransactionBodySchema> = {
      userId: userCreated.id,
      accountId: accountCreated.id,
      description: 'descrição de ganho',
      type: 'EXPENSE',
      amount: 18000,
      dueDate: new Date('2025-02-06T02:25:16.259Z'),
      effectiveDate: new Date(),
    }

    const response = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const transactionCreated = await prisma.transaction.findFirst({
      where: { userId: userCreated.id },
    })

    expect(response.statusCode).toEqual(201)
    expect(transactionCreated?.id).toEqual(expect.any(String))
    expect(transactionCreated?.description).toEqual('descrição de ganho')

    const accountAfterUpdate = await prisma.account.findUnique({
      where: {
        id: accountCreated.id,
      },
    })

    expect(accountAfterUpdate?.currentBalance).toEqual(-17000)
  })
})
