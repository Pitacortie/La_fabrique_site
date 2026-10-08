import { PrismaClient } from "@prisma/client";

// Un seul client Prisma par processus (évite d'ouvrir des connexions à chaque rechargement en dev).
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
