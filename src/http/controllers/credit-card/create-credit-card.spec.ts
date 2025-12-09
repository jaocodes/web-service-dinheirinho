import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { buildApp } from '@/app'
import { prisma } from '@/prisma-client'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeUser } from 'test/factories/makeUser'

const app = buildApp()

describe('(e2e) POST /transfer', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a credit card', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000 * 100,
    })

    const response = await request(app.server)
      .post('/credit-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cartão 01',
        accountId: account.id,
        closingDay: 10,
        dueDay: 17,
        limit: 50000,
      })

    const creditCard = await prisma.creditCard.findFirst({
      where: {
        accountId: account.id,
      },
    })
    expect(response.status).toEqual(201)
    expect(creditCard?.id).toEqual(expect.any(String))
  })

  it('should be able to create a credit card from another user account', async () => {
    const { userInput, userCreated } = await makeUser()
    const { userInput: anotherUserInput, userCreated: anotherUserCreated } =
      await makeUser()

    const { token } = await makeAuthenticateUser(app, userInput)

    const anotherUserAccount = await makeAccount({
      userId: anotherUserCreated.id,
      initialBalance: 1000 * 100,
    })

    const response = await request(app.server)
      .post('/credit-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cartão 02',
        accountId: anotherUserAccount.id,
        closingDay: 10,
        dueDay: 17,
        limit: 50000,
      })

    expect(response.status).toEqual(409)
  })
})
