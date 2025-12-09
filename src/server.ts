import { buildApp } from './app'
import { env } from './env'

const server = buildApp({
  logger: {
    level: 'info'
  }
})

server
  .listen({
    port: env.PORT,
    host: '0.0.0.0',
  })
  .then(() => console.log(`Server is runnning on port ${env.PORT}`))
