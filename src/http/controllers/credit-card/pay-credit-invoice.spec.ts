import { app } from "@/app";
import { prisma } from "@/prisma-client";
import { makeAccount } from "test/factories/makeAccount";
import { makeAuthenticateUser } from "test/factories/makeAuthenticateUser";
import { makeUser } from "test/factories/makeUser";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { createCreditExpenseBodySchema } from "../transactions/create-credit-expense";
import request from 'supertest'
import type { z } from "zod";

describe('PATCH /credit-cards/:creditCardId/invoice/pay', () => {
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

    it('should be able to pay a current invoice', async () => {
        vi.setSystemTime(new Date(2025, 1, 16, 10, 0, 0))

        const { userInput, userCreated } = await makeUser()
        const { token } = await makeAuthenticateUser(app, userInput)

        const account = await makeAccount({
            userId: userCreated.id,
            initialBalance: 1000,
        })

        const creditCard = await prisma.creditCard.create({
            data: {
                userId: userCreated.id,
                accountId: account.id,
                name: 'Credit Card',
                closingDay: 5,
                dueDay: 15,
                currentLimit: 200 * 100,
                initialLimit: 200 * 100,
            },
        })

        if (creditCard) {
            const creditExpense: z.infer<typeof createCreditExpenseBodySchema> = {
                description: 'gasolina',
                amount: 20 * 100,
                categoryId: 8,
                creditCardId: creditCard.id,
                dueDate: new Date(2025, 0, 20),
                isFixed: false,
                type: 'CREDIT',
                installments: 1,
            }

            await request(app.server)
                .post('/transactions/credit')
                .set('Authorization', `Bearer ${token}`)
                .send(creditExpense)


            const creditExpenseFixed: z.infer<typeof createCreditExpenseBodySchema> = {
                description: 'netflix',
                amount: 20 * 100,
                categoryId: 10,
                creditCardId: creditCard.id,
                dueDate: new Date(2025, 1, 4),
                isFixed: true,
                type: 'CREDIT',
                installments: 1,
            }
            await request(app.server)
                .post('/transactions/credit')
                .set('Authorization', `Bearer ${token}`)
                .send(creditExpenseFixed)
        }


        let creditCardCurrentLimit = await prisma.creditCard.findFirst({
            where: {
                id: creditCard.id
            },
            select: {
                currentLimit: true
            }
        })

        expect(creditCardCurrentLimit?.currentLimit).toEqual(160 * 100)

        const response = await request(app.server)
            .patch(`/credit-cards/${creditCard.id}/invoice/pay`)
            .query({ month: '2025-02' })
            .set('Authorization', `Bearer ${token}`)
            .send()


        expect(response.status).toEqual(201)

        creditCardCurrentLimit = await prisma.creditCard.findFirst({
            where: {
                id: creditCard.id
            },
            select: {
                currentLimit: true
            }
        })

        expect(creditCardCurrentLimit?.currentLimit).toEqual(180 * 100)


        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userCreated.id,
                type: 'CREDIT',
                effectived: true
            }
        })

        expect(transactions).toHaveLength(2)
    })




})