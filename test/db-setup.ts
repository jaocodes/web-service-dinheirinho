import { beforeAll } from "bun:test";
import { execSync } from 'node:child_process';
import { afterEach, beforeEach } from "node:test";
// import { randomUUID } from 'node:crypto';
// import { PrismaClient } from '@/generated/prisma/client';
// import { prisma as globalPrisma } from '@/prisma-client';
// import { PrismaPg } from '@prisma/adapter-pg';
import { prisma } from "@/prisma-client";

beforeAll(() => {
    console.log("[GLOBAL SETUP]")
})

beforeEach(() => {
    console.log("[TEST SETUP]")

    execSync('bun prisma migrate deploy');

    execSync('bun prisma/seed.ts');
})

afterEach(async () => {
    console.log("[DIE SETUP]")
    await prisma.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS ${process.env.DATABASE_SCHEMA} CASCADE`,
    );
    await prisma.$disconnect();

})

// let testSchema: string | null = null;
// let prismaClient: PrismaClient | null = null;

// export async function setupTestDatabase(): Promise<void> {
//     if (!process.env.DATABASE_URL) {
//         throw new Error('DATABASE_URL não está definido no .env para testes.');
//     }

//     testSchema = randomUUID();

//     const url = new URL(process.env.DATABASE_URL);

//     console.log(process.env.DATABASE_URL)

//     url.searchParams.set('schema', testSchema);

//     process.env.DATABASE_URL = url.toString();

//     const adapter = new PrismaPg({
//         connectionString: process.env.DATABASE_URL
//     });

//     globalPrisma.$disconnect();

//     Object.assign(globalPrisma, new PrismaClient({ adapter }));

//     console.log(`[DB Setup] Criando e aplicando migrações no schema: ${testSchema}`);
//     execSync('bun prisma migrate deploy', { stdio: 'inherit' });
//     execSync('bun prisma/seed.ts', { stdio: 'inherit' });

//     prismaClient = globalPrisma
// }


// export async function teardownTestDatabase(): Promise<void> {
//     if (!testSchema || !prismaClient) {
//         console.warn("[DB Teardown] Schema ou Prisma Client não inicializados.");
//         return;
//     }

//     console.log(`[DB Teardown] Destruindo schema: ${testSchema}`);

//     await prismaClient.$executeRawUnsafe(
//         `DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`,
//     );

//     await prismaClient.$disconnect();

//     testSchema = null;
//     prismaClient = null;
// }

// export function getPrismaClient(): PrismaClient {
//     if (!prismaClient) {
//         throw new Error("Prisma Client não está inicializado. Certifique-se de chamar setupTestDatabase() em beforeAll.");
//     }
//     return prismaClient;
// }