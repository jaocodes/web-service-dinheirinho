import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { buildApp } from '@/app'
import request from 'supertest'
import { makeAccount } from 'test/factories/makeAccount'
import { makeAuthenticateUser } from 'test/factories/makeAuthenticateUser'
import { makeTransaction } from 'test/factories/makeTransaction'
import { makeUser } from 'test/factories/makeUser'


const app = buildApp()

describe('(e2e) POST /transactions/:transactionId/effective', () => {
    beforeAll(async () => {
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    it('should be able to effective a transaction', async () => {
        const { userInput, userCreated } = await makeUser()
        const { token } = await makeAuthenticateUser(app, userInput)

        const account = await makeAccount({
            userId: userCreated.id,
            initialBalance: 125 * 100,
        })


        const transaction = await makeTransaction({
            userId: userCreated.id,
            accountId: account.id,
            amount: 25 * 100,
            dueDate: new Date(2025, 1, 6),
            type: 'EXPENSE',
            categoryId: 14,
        })

        const response = await request(app.server)
            .patch(`/transactions/${transaction.id}/effective`)
            .set('Authorization', `Bearer ${token}`)
            .send({})

        expect(response.status).toEqual(204)



    })
})
