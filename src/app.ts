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
import { AuthenticateUser } from './http/controllers/users/authenticate'
import { createAccount } from './http/controllers/accounts/create-account'
import { createTransaction } from './http/controllers/transactions/create-transaction'
import { fetchAccounts } from './http/controllers/accounts/fetch-accounts'

export const app = fastify().withTypeProvider<ZodTypeProvider>()

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
app.register(AuthenticateUser)
app.register(createAccount)
app.register(fetchAccounts)

app.register(createTransaction)
