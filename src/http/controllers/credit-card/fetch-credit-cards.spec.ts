import { makeAccount } from 'test/factories/makeAccount'
import { makeUser } from 'test/factories/makeUser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { prisma } from '@/prisma-client'

describe('(e2e) GET /transactions/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to fetch creditCards', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000,
    })

    const [creditCardRoxinho, creditCardVerdinho] =
      await prisma.creditCard.createManyAndReturn({
        data: [
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Roxinho',
            closingDay: 5,
            dueDay: 15,
            currentLimit: 200 * 100,
            initialLimit: 200 * 100,
          },
          {
            userId: userCreated.id,
            accountId: account.id,
            name: 'Verdinho',
            closingDay: 10,
            dueDay: 25,
            currentLimit: 100 * 100,
            initialLimit: 100 * 100,
          },
        ],
      })

    const response = await request(app.server)
      .get('/credit-cards')
      .set('Authorization', `Bearer ${token}`)
      .send()

    console.log(response.body)
    expect(response.status).toEqual(200)
    expect(response.body.creditCards).toHaveLength(2)
  })
})
