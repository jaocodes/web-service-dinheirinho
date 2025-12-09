import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { buildApp } from '@/app'
import request from 'supertest'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeUser } from 'test/factories/makeUser'

const app = buildApp()

describe('(e2e) GET /category', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to get default categories', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const response = await request(app.server)
      .get('/category')
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.categories).toHaveLength(16)
  })

  it('should be able to get categories with custom categories', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const customCategoryExpense = {
      name: 'Sapatos',
      type: 'EXPENSE',
    }

    const customCategoryIncome = {
      name: 'Pagamento',
      type: 'INCOME',
    }

    await request(app.server)
      .post('/category')
      .set('Authorization', `Bearer ${token}`)
      .send(customCategoryExpense)
    await request(app.server)
      .post('/category')
      .set('Authorization', `Bearer ${token}`)
      .send(customCategoryIncome)

    const response = await request(app.server)
      .get('/category')
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(response.status).toEqual(200)
    expect(response.body.categories).toHaveLength(18)
  })
})
