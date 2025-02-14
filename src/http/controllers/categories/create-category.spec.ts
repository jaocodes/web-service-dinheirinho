import { describe, expect, beforeAll, afterAll, it } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { makeUser } from 'test/factories/makeUser'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { prisma } from '@/prisma-client'

describe('(e2e) POST /category', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a category', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const customCategory = {
      name: 'gasolina',
      type: 'EXPENSE',
    }

    const response = await request(app.server)
      .post('/category')
      .set('Authorization', `Bearer ${token}`)
      .send(customCategory)

    const categoryCreated = await prisma.category.findFirst({
      where: {
        name: 'Gasolina',
      },
    })

    expect(response.status).toEqual(201)
    expect(categoryCreated?.userId).toEqual(userCreated.id)
  })

  it('should not be able to create a duplicate category from same user', async () => {
    const { userInput, userCreated } = await makeUser()
    const { token } = await makeAuthenticateUser(app, userInput)

    const customCategory = {
      name: 'Sapatos',
      type: 'EXPENSE',
    }

    await request(app.server)
      .post('/category')
      .set('Authorization', `Bearer ${token}`)
      .send(customCategory)

    const sameCustomCategory = {
      name: 'SAPATOS',
      type: 'EXPENSE',
    }

    const response = await request(app.server)
      .post('/category')
      .set('Authorization', `Bearer ${token}`)
      .send(sameCustomCategory)

    expect(response.status).toEqual(409)
  })
})
