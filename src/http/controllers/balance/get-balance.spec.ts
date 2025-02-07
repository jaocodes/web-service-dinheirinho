import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'
import type { createTransactionBodySchema } from '../transactions/create-transaction'

describe('(e2e) get /balance', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to get balance of transactions', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 125 * 100,
    })

    const transaction1: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 5 * 100,
      description: 'despesa de 5 reais em janeiro 2',
      dueDate: new Date(2025, 0, 2),
      type: 'EXPENSE',
      observations: 'apenas uma observação',
      effectived: true,
    }
    const transaction2: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 10 * 100,
      description: 'despesa de 10 reais em janeiro 15',
      dueDate: new Date(2025, 0, 15),
      type: 'EXPENSE',
      observations: 'apenas uma observação',
      effectived: true,
    }

    const transaction3: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 20 * 100,
      description: 'ganho de 20 reais em janeiro 20',
      dueDate: new Date(2025, 0, 20),
      type: 'INCOME',
      effectived: true,
    }

    const transaction4: z.infer<typeof createTransactionBodySchema> = {
      userId: user.id,
      accountId: account.id,
      amount: 10 * 100,
      description: 'ganho de 100 reais em janeiro 5 fixa, ocorre todo mes',
      dueDate: new Date(2025, 1, 5),
      type: 'INCOME',
      isFixed: true,
    }

    await request(app.server).post('/transactions').send(transaction1)
    await request(app.server).post('/transactions').send(transaction2)
    await request(app.server).post('/transactions').send(transaction3)
    await request(app.server).post('/transactions').send(transaction4)

    const response = await request(app.server)
      .get(`/balance/${user.id}`)
      .query({ month: '2025-03' })
      .send()

    console.log(response.body)

    expect(response.status).toEqual(200)
    expect(response.body.balance).toEqual(25 * 100)
    expect(response.body.totalAmmountAcounts).toEqual(150 * 100)
  })
})
