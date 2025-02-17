import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJWT } from '../hooks/verify-jwt'
import { z } from 'zod'
import { prisma } from '@/prisma-client'

export const fetchCreditCardsResponseSchema = z.object({
  creditCards: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      initialLimit: z.number().int(),
      currentLimit: z.number().int(),
      account: z.object({
        id: z.string().uuid(),
        name: z.string(),
      }),
      openedInvoiceDate: z.coerce.date(),
      openedInvoiceAmount: z.number().int(),
      closedInvoiceDate: z.coerce.date(),
      closedInvoiceAmount: z.number().int(),
    }),
  ),
})

function getInvoicesDate(closingDay: number, dueDay: number) {
  const currentDate = new Date()

  if (currentDate.getDate() > closingDay) {
    const openedInvoiceDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      dueDay,
    )

    const closedInvoiceDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      dueDay,
    )

    return { openedInvoiceDate, closedInvoiceDate }
  }

  const openedInvoiceDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    dueDay,
  )

  const closedInvoiceDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    dueDay,
  )

  return { openedInvoiceDate, closedInvoiceDate }
}

export const fetchCreditCards: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/credit-cards',
    {
      onRequest: [verifyJWT],
      schema: {
        response: {
          200: fetchCreditCardsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub

      const creditCards = await prisma.creditCard.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          name: true,
          initialLimit: true,
          currentLimit: true,
          dueDay: true,
          closingDay: true,
          account: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      const creditCardWithOpenInvoices = await Promise.all(
        creditCards.map(async (creditCard) => {
          const { openedInvoiceDate, closedInvoiceDate } = getInvoicesDate(
            creditCard.closingDay,
            creditCard.dueDay,
          )

          const openedCreditExpenses = await prisma.transaction.aggregate({
            where: {
              creditCardId: creditCard.id,
              userId,
              invoiceDate: openedInvoiceDate,
            },
            _sum: {
              amount: true,
            },
          })

          const closedCreditExpenses = await prisma.transaction.aggregate({
            where: {
              creditCardId: creditCard.id,
              userId,
              invoiceDate: closedInvoiceDate,
            },
            _sum: {
              amount: true,
            },
          })

          return {
            id: creditCard.id,
            name: creditCard.name,
            initialLimit: creditCard.initialLimit,
            currentLimit: creditCard.currentLimit,
            account: creditCard.account,
            openedInvoiceDate,
            openedInvoiceAmount: openedCreditExpenses._sum.amount || 0,
            closedInvoiceDate,
            closedInvoiceAmount: closedCreditExpenses._sum.amount || 0,
          }
        }),
      )

      return reply.status(200).send({ creditCards: creditCardWithOpenInvoices })
    },
  )
}
