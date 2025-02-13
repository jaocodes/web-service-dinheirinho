import { makeAccount } from 'test/factories/makeAccount'
import { makeTransaction } from 'test/factories/makeTransaction'
import { makeUser } from 'test/factories/makeUser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'

describe('(e2e) GET /transactions/:userId/balance', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return the balance, total income, and total expense for a given user and month', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 500,
      type: 'INCOME',
      dueDate: new Date('2025-02-15T00:00:00.000Z'),
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 300,
      type: 'EXPENSE',
      dueDate: new Date('2025-02-20T00:00:00.000Z'),
    })

    const response = await request(app.server)
      .get('/transactions/balance')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body.totalIncome).toEqual(500)
    expect(response.body.totalExpense).toEqual(300)
    expect(response.body.balance).toEqual(200)
  })

  it('should only consider transactions within the month range', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 500,
      type: 'INCOME',
      dueDate: new Date(2025, 1, 1, 0, 0, 0, 0),
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 300,
      type: 'EXPENSE',
      dueDate: new Date(2025, 1, 28, 23, 59, 59, 999),
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 1000,
      type: 'INCOME',
      dueDate: new Date(2025, 0, 31, 23, 59, 59, 999),
    })

    await makeTransaction({
      accountId: account.id,
      userId: userCreated.id,
      amount: 800,
      type: 'EXPENSE',
      dueDate: new Date(2025, 2, 1, 0, 0, 0, 0),
    })

    const response = await request(app.server)
      .get('/transactions/balance')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body.totalIncome).toEqual(500)
    expect(response.body.totalExpense).toEqual(300)
    expect(response.body.balance).toEqual(200)
  })
})
