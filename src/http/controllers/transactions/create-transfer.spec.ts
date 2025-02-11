import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { prisma } from '@/prisma-client'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'

describe('(e2e) POST /transfer', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a transfer between accounts', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const sourceAccount = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000 * 100,
    })
    const targetAccount = await makeAccount({
      userId: userCreated.id,
      initialBalance: 500 * 100,
    })

    const transferData = {
      userId: userCreated.id,
      sourceAccountId: sourceAccount.id,
      targetAccountId: targetAccount.id,
      amount: 200 * 100,
      dueDate: new Date(2025, 1, 7),
      observations: 'Transferência de teste',
    }

    const response = await request(app.server)
      .post('/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData)

    expect(response.statusCode).toEqual(201)

    const transactions = await prisma.transaction.findMany({
      where: { transferId: { not: null } },
      orderBy: { createdAt: 'asc' },
    })

    expect(transactions).toHaveLength(2)

    const transferOut = transactions[0]
    expect(transferOut.accountId).toEqual(sourceAccount.id)
    expect(transferOut.targetAccountId).toEqual(targetAccount.id)
    expect(transferOut.amount).toEqual(200 * 100)
    expect(transferOut.type).toEqual('TRANSFER_OUT')
    expect(transferOut.effectived).toEqual(true)

    const transferIn = transactions[1]
    expect(transferIn.accountId).toEqual(targetAccount.id)
    expect(transferIn.targetAccountId).toEqual(sourceAccount.id)
    expect(transferIn.amount).toEqual(200 * 100)
    expect(transferIn.type).toEqual('TRANSFER_IN')
    expect(transferIn.effectived).toEqual(true)

    expect(transferOut.transferId).toEqual(transferIn.transferId)
  })

  it('should not allow transfers with invalid user or accounts', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const validAccount = await makeAccount({ userId: userCreated.id })

    const transferData = {
      userId: userCreated.id,
      sourceAccountId: validAccount.id,
      targetAccountId: '00000000-0000-0000-0000-000000000000',
      amount: 200 * 100,
      dueDate: new Date(),
      observations: 'Transferência com conta inválida',
    }

    const response = await request(app.server)
      .post('/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData)

    expect(response.statusCode).toEqual(409)
    expect(response.body.message).toEqual('User or account not found')
  })

  it('should not allow transfers with future due dates', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const sourceAccount = await makeAccount({ userId: userCreated.id })
    const targetAccount = await makeAccount({ userId: userCreated.id })

    const transferData = {
      userId: userCreated.id,
      sourceAccountId: sourceAccount.id,
      targetAccountId: targetAccount.id,
      amount: 200 * 100,
      dueDate: new Date(2030, 1, 1),
      observations: 'Transferência com data futura',
    }

    const response = await request(app.server)
      .post('/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData)

    expect(response.statusCode).toEqual(400)
    expect(response.body.message).toEqual(
      'Transferencias nao podem ser cadastradas no futuro',
    )
  })
})
