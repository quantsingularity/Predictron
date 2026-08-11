import { PrismaClient } from "@prisma/client";

// All queries are parameterized by Prisma, no raw SQL string-building.
export const prisma = new PrismaClient();
