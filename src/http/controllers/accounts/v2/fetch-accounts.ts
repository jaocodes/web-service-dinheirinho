import { prisma } from '@/prisma-client'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../../hooks/verify-jwt'


export const accountsResponseSchema = z.object({
    accounts: z.array(
        z.object({
            id: z.string().uuid(),
            name: z.string(),
            type: z.enum(['BANK', 'WALLET']),
            initialBalance: z.number().int(),
            createdAt: z.date(),
            updatedAt: z.date(),
        }),
    ),
})

const userNotFoundResponse = z.object({
    message: z.string(),
})

export const fetchAccounts: FastifyPluginAsyncZod = async (app) => {
    app.get(
        'v2/accounts',
        {
            onRequest: [verifyJWT],
            schema: {
                security: [{ BearerAuth: [] }],
                response: {
                    200: accountsResponseSchema,
                    409: userNotFoundResponse,
                },
            },
        },
        async (request, reply) => {
            const userId = request.user.sub

            const userExists = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            })

            if (!userExists) {
                return reply.status(409).send({ message: 'User does not exists' })
            }

            const accounts = await prisma.account.findMany({
                where: {
                    userId
                }
            })


            return reply.status(200).send({ accounts })
        },
    )
}
