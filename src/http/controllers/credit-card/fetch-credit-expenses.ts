import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { prisma } from '@/prisma-client'

const fetchCreditExpensesParamsSchema = z.object({
  creditCardId: z.string().uuid(),
})

const fetchCreditExpensesQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

const fetchCreditExpensesResponseSchema = z.object({
  invoice: z.object({
    totalAmount: z.number().int(),
    dueDate: z.coerce.number(),
    closingDate: z.coerce.number(),
    isPaid: z.boolean(),
  }),
  expenses: z.array(
    z.object({
      id: z.string().uuid(),
      description: z.string(),
      amount: z.number().int(),
      dueDate: z.date(),
      category: z.string(),
      installments: z.coerce.number().int(),
      isFixed: z.boolean(),
      observations: z.string().nullable(),
    }),
  ),
})

export const fetchCreditExpenses: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/credit-cards/:creditCardId/invoice',
    {
      onRequest: [verifyJWT],
      schema: {
        querystring: fetchCreditExpensesQuerySchema,
        params: fetchCreditExpensesParamsSchema,
        response: {
          200: fetchCreditExpensesResponseSchema,
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub
      const { creditCardId } = request.params
      const { month } = request.query

      const invoiceYear = Number(month.split('-')[0])
      const invoiceMonth = Number(month.split('-')[1]) - 1

      const creditCard = await prisma.creditCard.findUnique({
        where: { id: creditCardId, userId },
        select: { closingDay: true, dueDay: true },
      })

      if (!creditCard) {
        return reply.status(404).send({ message: 'Cartão não encontrado' })
      }

      const currentInvoiceDate = new Date(
        invoiceYear,
        invoiceMonth,
        creditCard?.dueDay,
      )

      const expenses = await prisma.transaction.findMany({
        where: {
          creditCardId,
          userId,
          invoiceDate: currentInvoiceDate,
        },
        include: {
          category: { select: { name: true } },
        },
        orderBy: {
          dueDate: 'desc',
        },
      })

      const totalAmount = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      )

      return reply.status(200).send({
        invoice: {
          closingDate: creditCard.closingDay,
          dueDate: creditCard.dueDay,
          isPaid: expenses.every((expense) => expense.effectived === false),
          totalAmount,
        },
        expenses: expenses.map((expense) => ({
          id: expense.id,
          amount: expense.amount,
          category: expense.category.name,
          description: expense.description,
          dueDate: expense.dueDate,
          isFixed: expense.isFixed,
          installments: expense.installments || 1,
          observations: expense.observations,
        })),
      })
    },
  )
}
