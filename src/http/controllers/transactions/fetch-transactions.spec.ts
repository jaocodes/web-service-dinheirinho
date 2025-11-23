import { app } from '@/app'
import { faker } from '@faker-js/faker'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeTransaction } from 'test/factories/makeTransaction'
import { makeUser } from 'test/factories/makeUser'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

describe('(e2e) GET /transactions/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })


  it('should be able to fetch transactions by userId and month', async () => {
    vi.setSystemTime(new Date(2025, 1, 9, 10, 0, 0))
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account1 = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    const account2 = await makeAccount({
      userId: userCreated.id,
      initialBalance: 5000,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: userCreated.id,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: userCreated.id,
    })

    await makeTransaction({
      accountId: account2.id,
      userId: userCreated.id,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: userCreated.id,
      dueDate: faker.date.soon({
        days: 5,
        refDate: '2025-03-10T00:00:00.000Z',
      }),
      effectived: true,
    })

    const response = await request(app.server)
      .get('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })
      .send()

    expect(response.statusCode).toEqual(200)
    expect(response.body.transactions).toHaveLength(3)

    vi.useRealTimers()


  })
})
