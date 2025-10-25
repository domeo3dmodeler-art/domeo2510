import { PrismaClient } from '@prisma/client'

// Глобальный singleton Prisma (чтобы в dev не плодились соединения)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // при желании: log: ['query','error','warn']
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
