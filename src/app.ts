import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastify from 'fastify'

import {
  type ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { env } from './env'
import { createAccount } from './http/controllers/accounts/create-account'
import { fetchAccounts } from './http/controllers/accounts/fetch-accounts'
import { getTotalAmount } from './http/controllers/accounts/get-total-amount'
import { createCategory } from './http/controllers/categories/create-category'
import { fetchCategories } from './http/controllers/categories/fetch-categories'
import { createCreditCard } from './http/controllers/credit-card/create-credit-card'
import { fetchCreditCards } from './http/controllers/credit-card/fetch-credit-cards'
import { fetchCreditExpenses } from './http/controllers/credit-card/fetch-credit-expenses'
import { payCreditInvoice } from './http/controllers/credit-card/pay-credit-invoice'
import { createCreditExpense } from './http/controllers/transactions/create-credit-expense'
import { createTransaction } from './http/controllers/transactions/create-transaction'
import { createTranfer } from './http/controllers/transactions/create-transfer'
import { effectiveTransaction } from './http/controllers/transactions/effective-transaction'
import { fetchTransactions } from './http/controllers/transactions/fetch-transactions'
import { getTransactionsMonthBalance } from './http/controllers/transactions/get-transactions-month-balance'
import { authenticateUser } from './http/controllers/users/authenticate'
import { logout } from './http/controllers/users/logout'
import { refresh } from './http/controllers/users/refresh'
import { registerUser } from './http/controllers/users/register'

export const app = fastify().withTypeProvider<ZodTypeProvider>()
app.register(cors, {
  credentials: true,
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'HEAD']
})
app.register(fastifyJwt, {
  secret: env.SUPER_SECRET_JWT,
  sign: {
    expiresIn: '10m',
  },
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
})

app.register(fastifyCookie)

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API Dinheirinho',
      description: 'Documentação da API Dinheirinho',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          bearerFormat: 'JwtPayload',
          type: 'http',
          scheme: 'bearer',
          description: 'Insert a JWT token in format: Bearer <token>',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(registerUser)
app.register(authenticateUser)
app.register(refresh)
app.register(logout)

app.register(createAccount)
app.register(fetchAccounts)
app.register(getTotalAmount)

app.register(createTransaction)
app.register(fetchTransactions)
app.register(createTranfer)
app.register(createCreditExpense)
app.register(effectiveTransaction)
app.register(getTransactionsMonthBalance)

app.register(createCategory)
app.register(fetchCategories)

app.register(createCreditCard)
app.register(fetchCreditCards)
app.register(fetchCreditExpenses)
app.register(payCreditInvoice)
