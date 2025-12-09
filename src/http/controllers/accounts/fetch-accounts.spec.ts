import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { buildApp } from '@/app'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeUser } from 'test/factories/makeUser'
import type { z } from 'zod'
import type { createTransactionBodySchema } from '../transactions/create-transaction'
import type { accountsResponseSchema } from './fetch-accounts'

const app = buildApp()

describe('(e2e) GET /users/:userId/accounts', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  const createTransaction = async (
    transaction: z.infer<typeof createTransactionBodySchema>,
    token: string,
  ) => {
    await request(app.server)
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction)
  }

  it('should calculate balances correctly for different transaction types', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const accountOne = await makeAccount({
      userId: userCreated.id,
      name: 'CONTA 1',
      initialBalance: 1000 * 100,
    })

    const accountTwo = await makeAccount({
      userId: userCreated.id,
      name: 'CONTA 2',
      initialBalance: 2000 * 100,
    })

    await createTransaction(
      {
        accountId: accountOne.id,
        amount: 500 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 1, 1),
        effectived: true,
        description: 'Salário',
      },
      token,
    )
    await createTransaction(
      {
        accountId: accountOne.id,
        amount: 200 * 100,
        type: 'EXPENSE',
        categoryId: 14,

        dueDate: new Date(2025, 1, 2),
        effectived: true,
        description: 'Aluguel',
      },
      token,
    )
    await createTransaction(
      {
        accountId: accountOne.id,
        amount: 300 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 1, 3),
        description: 'Bônus',
      },
      token,
    )

    // Conta 1 - initialBalance de +1000
    // 2 transações efetivadas em fevereiro - sendo +500 -200
    // 1 transação não efetivada em fevereiro - sendo +300
    //
    // currentTotalAmount deve ser 1300 já que a não efetivada não entra nesse cáclculo
    // expectedTotalAmount deve ser 1600 já que a não efetivada entra nesse calculo

    await createTransaction(
      {
        accountId: accountTwo.id,
        amount: 600 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 1, 1),
        effectived: true,
        description: 'Salário',
      },
      token,
    )
    await createTransaction(
      {
        accountId: accountTwo.id,
        amount: 300 * 100,
        type: 'EXPENSE',
        categoryId: 14,
        dueDate: new Date(2025, 1, 2),
        effectived: true,
        description: 'Aluguel',
      },
      token,
    )

    await createTransaction(
      {
        accountId: accountTwo.id,
        amount: 400 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 1, 3),
        description: 'Bônus',
      },
      token,
    )

    // Conta 2 initialBalance de 2000
    // 2 transações efetivadas em fevereiro - sendo +600 -300
    // 1 transação não efetivada em fevereiro - sendo +400
    //
    // currentTotalAmount deve ser 2300 já que a não efetivada não entra nesse cáclculo
    // expectedTotalAmount deve ser 2700 já que a não efetivada entra nesse calculo

    const transferData = {
      userId: userCreated.id,
      sourceAccountId: accountTwo.id,
      targetAccountId: accountOne.id,
      amount: 500 * 100,
      dueDate: new Date(2025, 1, 5),
      observations: 'Transferência de teste',
    }

    await request(app.server)
      .post('/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData)

    //Adicionada uma transferência de 500 da Conta 2 para Conta 1
    //As transferencias sempre são efetivadas
    // currentTotalAmount da Conta 1 passa pcara 1800
    // currentTotalAmount da Conta 2 passa para 1800
    // expectedTotalAmount da Conta 1 passa para 2100
    // expectedTotalAmount da Conta 2 passa para 2200

    // para uma busca com mês de referência fevereiro temos
    const response = await request(app.server)
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })


    expect(response.statusCode).toEqual(200)
    expect(response.body.accounts).toHaveLength(2)
    expect(response.body.accounts[0]).toMatchObject({
      currentTotalAmount: 1800 * 100,
      expectedTotalAmount: 2100 * 100,
    })
    expect(response.body.accounts[1]).toMatchObject({
      currentTotalAmount: 1800 * 100,
      expectedTotalAmount: 2200 * 100,
    })
  })

  it('should handle transfer transactions between accounts', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const accountOne = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1500 * 100,
    })
    const accountTwo = await makeAccount({
      userId: userCreated.id,
      initialBalance: 500 * 100,
    })

    const transferData = {
      userId: userCreated.id,
      sourceAccountId: accountTwo.id,
      targetAccountId: accountOne.id,
      amount: 500 * 100,
      dueDate: new Date(2025, 1, 5),
      observations: 'Transferência de teste',
    }

    await request(app.server)
      .post('/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData)

    const response = await request(app.server)
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })

    const { accounts } = response.body as z.infer<typeof accountsResponseSchema>

    const accountOneResult = accounts.find((a) => a.id === accountOne.id)
    const accountTwoResult = accounts.find((a) => a.id === accountTwo.id)

    expect(accountOneResult?.currentTotalAmount).toEqual(2000 * 100)
    expect(accountTwoResult?.currentTotalAmount).toEqual(0 * 100)
  })

  it('should filter transactions by month correctly', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 1000 * 100,
    })

    await createTransaction(
      {
        accountId: account.id,
        amount: 500 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 0, 31),
        effectived: true,
        description: 'Salário Jan',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 200 * 100,
        type: 'EXPENSE',
        categoryId: 14,
        dueDate: new Date(2025, 1, 1),
        effectived: true,
        description: 'Aluguel Fev',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 100 * 100,
        type: 'EXPENSE',
        categoryId: 14,
        dueDate: new Date(2025, 1, 28),
        description: 'Gasolina Fev',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 300 * 100,
        type: 'INCOME',
        categoryId: 1,
        dueDate: new Date(2025, 2, 1),
        description: 'Bônus Mar',
      },
      token,
    )
    // Testar consulta para fevereiro
    const responseToFeb = await request(app.server)
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })

    expect(responseToFeb.body.accounts[0]).toMatchObject({
      currentTotalAmount: 1300 * 100, // 1000 + 500 - 200
      expectedTotalAmount: 1200 * 100, // 1000 + 500 - 200 - 100 (transação de março não entra)
    })

    const responseToMarch = await request(app.server)
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-03' })

    expect(responseToMarch.body.accounts[0]).toMatchObject({
      currentTotalAmount: 1300 * 100, // 1000 + 500 - 200
      expectedTotalAmount: 1500 * 100, // 1000 + 500 - 200 - 100 + 300
    })
  })
})
