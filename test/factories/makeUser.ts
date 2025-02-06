import type { registerUserBodySchema } from '@/http/controllers/users/register'
import type { z } from 'zod'
import { faker } from '@faker-js/faker'

type UserZodSchema = z.infer<typeof registerUserBodySchema>

export async function makeUser(override: Partial<UserZodSchema> = {}) {
  const user: UserZodSchema = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    username: faker.internet.username(),
    password: faker.internet.password(),
    ...override,
  }

  return user
}
