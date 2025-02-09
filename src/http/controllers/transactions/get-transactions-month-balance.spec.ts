import { makeAccount } from 'test/factories/makeAccount'
import { makeTransaction } from 'test/factories/makeTransaction'
import { makeUser } from 'test/factories/makeUser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { faker } from '@faker-js/faker'

describe('(e2e) GET /transactions/:userId/balance', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return the balance, total income, and total expense for a given user and month', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 1000,
    })

    await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 500,
      type: 'INCOME',
      dueDate: new Date('2025-02-15T00:00:00.000Z'),
    })

    await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 300,
      type: 'EXPENSE',
      dueDate: new Date('2025-02-20T00:00:00.000Z'),
    })

    const response = await request(app.server)
      .get(`/transactions/${user.id}/balance`)
      .query({ month: '2025-02' })
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body.totalIncome).toEqual(500)
    expect(response.body.totalExpense).toEqual(300)
    expect(response.body.balance).toEqual(200)
  })

  it('should return 404 if user does not exist', async () => {
    const response = await request(app.server)
      .get(`/transactions/${faker.string.uuid()}/balance`)
      .query({ month: '2025-02' })
      .send()
    expect(response.statusCode).toEqual(404)
    expect(response.body.message).toEqual('Resource not found')
  })

  it('should only consider transactions within the month range', async () => {
    const user = await makeUser()
    const account = await makeAccount({
      userId: user.id,
      initialBalance: 1000,
    })

    // Dentro do mês
    const transaction = await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 500,
      type: 'INCOME',
      dueDate: new Date(2025, 1, 1, 0, 0, 0, 0),
    })

    await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 300,
      type: 'EXPENSE',
      dueDate: new Date(2025, 1, 28, 23, 59, 59, 999),
    })

    await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 1000,
      type: 'INCOME',
      dueDate: new Date(2025, 0, 31, 23, 59, 59, 999),
    })

    await makeTransaction({
      accountId: account.id,
      userId: user.id,
      amount: 800,
      type: 'EXPENSE',
      dueDate: new Date(2025, 2, 1, 0, 0, 0, 0),
    })

    const response = await request(app.server)
      .get(`/transactions/${user.id}/balance`)
      .query({ month: '2025-02' })
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body.totalIncome).toEqual(500)
    expect(response.body.totalExpense).toEqual(300)
    expect(response.body.balance).toEqual(200)
  })
})
