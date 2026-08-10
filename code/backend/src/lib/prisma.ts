import { PrismaClient } from "@prisma/client";

// Every query made through this client is parameterized by Prisma, there
// is no path in this codebase that string-interpolates user input into SQL.
export const prisma = new PrismaClient();
