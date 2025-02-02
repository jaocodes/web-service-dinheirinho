import { z } from 'zod'

const envSchema = z.object({
    NODE_ENV: z.enum(['dev', 'prod', 'test']).default('dev'),
    PORT: z.coerce.number().default(3333),
    SUPER_SECRET_JWT: z.string(),
    DATABASE_URL: z.string(),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
    console.error('Environment validation error:', _env.error.format())

    throw new Error('Environment validation error')
}

export const env = _env.data