import { endOfMonth } from 'date-fns'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const fetchTransactionParamsSchema = z.object({
  userId: z.string().uuid(),
})

const fetchTransactionQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato inválido. Use 'YYYY-MM'"),
})

const transactionsResponseSchema = z.object({
  transactions: z.object({
    incomes: z.number().int(),
    expenses: z.number().int(),
    balance: z.number().int(),
  }),
  accounts: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      balance: z.number().int(),
    }),
  ),
  currentBalance: z.number().int(),
})

const userNotFoundResponse = z.object({
  message: z.string(),
})

export const getBalance: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/balance/:userId',
    {
      schema: {
        querystring: fetchTransactionQuerySchema,
        params: fetchTransactionParamsSchema,
        response: {
          200: z.null(),
          409: userNotFoundResponse,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params
      const { month } = request.query

      const date = new Date(`${month}-01T12:00:00.000Z`) //constroi uma data válida no mês informado, data em UTC

      const endDate = endOfMonth(date) // controi uma data que representa o ultimo dia no último milisegundo em UTC
      console.log(endDate)

      // Comparação com o mês atual
      const isCurrentMonth = endDate.getMonth() === new Date().getMonth() // compara se a data informada é do mês atual, pois dependendo do caso dispara regras de negocio diferentes

      return reply.status(200).send()
    },
  )
}
