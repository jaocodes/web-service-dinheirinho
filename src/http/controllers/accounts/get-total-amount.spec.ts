import {
  describe,
  expect,
  beforeAll,
  afterAll,
  it,
  vi,
  afterEach,
  beforeEach,
} from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import type { z } from 'zod'
import { makeUser } from 'test/factories/makeUser'
import { makeAccount } from 'test/factories/makeAccount'
import type { createTransactionBodySchema } from '../transactions/create-transaction'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'

describe('(e2e) GET /totalAmount/:userId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
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

  it('deve retornar o balanço do mês passado com tipo SALDO_ATÉ_O_FIM_DO_MÊS', async () => {
    vi.setSystemTime(new Date(2025, 1, 9, 10, 0, 0))

    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)
    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100,
    })

    await createTransaction(
      {
        accountId: account.id,
        amount: 10 * 100,
        description: 'Receita efetivada em dezembro',
        dueDate: new Date(2024, 11, 15),
        type: 'INCOME',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 3 * 100,
        description: 'Despesa efetivada em dezembro',
        dueDate: new Date(2024, 11, 20),
        type: 'EXPENSE',
        effectived: true,
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 5 * 100,
        description: 'Despesa efetivada em janeiro',
        dueDate: new Date(2025, 0, 10),
        type: 'EXPENSE',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 200,
        description: 'Despesa não efetivada em janeiro',
        dueDate: new Date(2025, 0, 15),
        type: 'EXPENSE',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 1000,
        description: 'Receita efetivada em fevereiro',
        dueDate: new Date(2025, 1, 3),
        type: 'INCOME',
      },
      token,
    )

    const response = await request(app.server)
      .get('/totalAmount')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-01' })
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.totalAmountAccountsType).toEqual(
      'SALDO_ATÉ_O_FIM_DO_MÊS',
    )
    expect(response.body.totalAmountAccounts).toEqual(12700)
  })

  it('deve retornar o balanço do mês atual com tipo SALDO_ATUAL_EM_CONTAS', async () => {
    vi.setSystemTime(new Date(2025, 1, 9, 10, 0, 0))

    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100,
    })

    await createTransaction(
      {
        accountId: account.id,
        amount: 5 * 100,
        description: 'Receita efetivada em janeiro',
        dueDate: new Date(2025, 0, 20),
        type: 'INCOME',
        effectived: true,
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 3 * 100,
        description: 'Despesa não efetivada em janeiro',
        dueDate: new Date(2025, 0, 25),
        type: 'EXPENSE',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 7 * 100,
        description: 'Despesa efetivada em fevereiro',
        dueDate: new Date(2025, 1, 3),
        type: 'EXPENSE',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 10 * 100,
        description: 'Receita efetivada em fevereiro',
        dueDate: new Date(2025, 1, 6),
        type: 'INCOME',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 4 * 100,
        description: 'Despesa não efetivada em fevereiro',
        dueDate: new Date(2025, 1, 15),
        type: 'EXPENSE',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 5 * 100,
        description: 'Despesa efetivada em março',
        dueDate: new Date(2025, 2, 5),
        type: 'EXPENSE',
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 6 * 100,
        description: 'Receita não efetivada em março',
        dueDate: new Date(2025, 2, 10),
        type: 'INCOME',
      },
      token,
    )

    const response = await request(app.server)
      .get('/totalAmount')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-02' })
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.totalAmountAccountsType).toEqual(
      'SALDO_ATUAL_EM_CONTAS',
    )
    expect(response.body.totalAmountAccounts).toEqual(13300)
  })

  it('deve retornar o balanço do mês futuro com tipo SALDO_PREVISTO', async () => {
    vi.setSystemTime(new Date(2025, 1, 9, 10, 0, 0))
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const account = await makeAccount({
      userId: userCreated.id,
      initialBalance: 125 * 100, // 12500
    })

    await createTransaction(
      {
        accountId: account.id,
        amount: 10 * 100,
        description: 'Receita efetivada em janeiro',
        dueDate: new Date(2025, 0, 20),
        type: 'INCOME',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 200,
        description: 'Despesa não efetivada em janeiro',
        dueDate: new Date(2025, 0, 25),
        type: 'EXPENSE',
      },
      token,
    )

    await createTransaction(
      {
        accountId: account.id,
        amount: 800,
        description: 'Despesa efetivada em fevereiro',
        dueDate: new Date(2025, 1, 6),
        type: 'EXPENSE',
        effectived: true,
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 300,
        description: 'Receita não efetivada em fevereiro',
        dueDate: new Date(2025, 1, 15),
        type: 'INCOME',
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 1500,
        description: 'Receita efetivada em março',
        dueDate: new Date(2025, 2, 10),
        type: 'INCOME',
      },
      token,
    )
    await createTransaction(
      {
        accountId: account.id,
        amount: 400,
        description: 'Despesa não efetivada em março',
        dueDate: new Date(2025, 2, 25),
        type: 'EXPENSE',
      },
      token,
    )

    const response = await request(app.server)
      .get('/totalAmount')
      .set('Authorization', `Bearer ${token}`)
      .query({ month: '2025-03' })
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.totalAmountAccountsType).toEqual('SALDO_PREVISTO')
    expect(response.body.totalAmountAccounts).toEqual(13900)
  })
})
