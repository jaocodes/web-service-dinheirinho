import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { makeUser } from 'test/factories/makeUser'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'

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

    console.log(response.body)
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

    console.log(response.body)
    expect(response.status).toEqual(200)
    expect(response.body.categories).toHaveLength(18)
  })
})
