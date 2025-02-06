import { makeAccount } from 'test/factories/makeAccount'
import { makeTransaction } from 'test/factories/makeTransaction'
import { makeUser } from 'test/factories/makeUser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { faker } from '@faker-js/faker'

describe('(e2e) GET /transactions/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to fetch transactions by userId and month', async () => {
    const user = await makeUser()
    const account1 = await makeAccount({
      userId: user.id,
      initialBalance: 1000,
    })

    const account2 = await makeAccount({
      userId: user.id,
      initialBalance: 5000,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: user.id,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: user.id,
    })

    await makeTransaction({
      accountId: account2.id,
      userId: user.id,
    })

    await makeTransaction({
      accountId: account1.id,
      userId: user.id,
      dueDate: faker.date.soon({
        days: 5,
        refDate: '2025-03-10T00:00:00.000Z',
      }),
      effectiveDate: faker.date.soon(),
    })

    const response = await request(app.server)
      .get(`/transactions/${user.id}`)
      .query({ month: '2025-02' })
      .send()

    console.log(JSON.stringify(response.body, null, 2))

    expect(response.statusCode).toEqual(200)
    expect(response.body.transactions).toHaveLength(4)
  })
})
