import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { prisma } from '@/prisma-client'

const payCreditInvoiceParamsSchema = z.object({
  creditCardId: z.string().uuid(),
})

const payCreditInvoiceQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})
export const payCreditInvoice: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/credit-cards/:creditCardId/invoice/pay',
    {
      onRequest: [verifyJWT],
      schema: {
        querystring: payCreditInvoiceQuerySchema,
        params: payCreditInvoiceParamsSchema,
        response: {
          204: z.null(),
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { creditCardId } = request.params
      const { month } = request.query
      const userId = request.user.sub

      const invoiceYear = Number(month.split('-')[0])
      const invoiceMonth = Number(month.split('-')[1]) - 1

      const creditCard = await prisma.creditCard.findUnique({
        where: { id: creditCardId, userId },
        select: { accountId: true, currentLimit: true, dueDay: true },
      })

      if (!creditCard) {
        return reply.status(404).send({ message: 'Cartão não encontrado' })
      }

      const currentInvoiceDate = new Date(
        invoiceYear,
        invoiceMonth,
        creditCard?.dueDay,
      )

      const transactions = await prisma.transaction.findMany({
        where: {
          creditCardId,
          invoiceDate: currentInvoiceDate,
          effectived: false,
          isFixed: false,
        },
      })

      if (transactions.length === 0) {
        return reply
          .status(409)
          .send({ message: 'Nenhuma transação pendente encontrada' })
      }

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: {
            creditCardId,
            invoiceDate: currentInvoiceDate,
          },
          data: { effectived: true },
        }),
        prisma.creditCard.update({
          where: { id: creditCardId },
          data: { currentLimit: { increment: totalAmount } },
        }),
      ])

      return reply.status(201).send()
    },
  )
}
