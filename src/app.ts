import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { registerUser } from './http/controllers/users/register'
import { authenticateUser } from './http/controllers/users/authenticate'
import { createAccount } from './http/controllers/accounts/create-account'
import { createTransaction } from './http/controllers/transactions/create-transaction'
import { fetchAccounts } from './http/controllers/accounts/fetch-accounts'
import { fetchTransactions } from './http/controllers/transactions/fetch-transaction'
import { createTranfer } from './http/controllers/transactions/create-transfer'
import { getTransactionsMonthBalance } from './http/controllers/transactions/get-transactions-month-balance'
import { getTotalAmount } from './http/controllers/accounts/get-total-amount'
import fastifyJwt from '@fastify/jwt'
import { env } from './env'
import fastifyCookie from '@fastify/cookie'

export const app = fastify().withTypeProvider<ZodTypeProvider>()

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
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(registerUser)
app.register(authenticateUser)

app.register(createAccount)
app.register(fetchAccounts)
app.register(getTotalAmount)

app.register(createTransaction)
app.register(fetchTransactions)
app.register(createTranfer)

app.register(getTransactionsMonthBalance)
