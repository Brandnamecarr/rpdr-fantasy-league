// Doc: Prisma database client singleton instance.
// Doc: Exports a configured PrismaClient for database operations throughout the application.
import { PrismaClient } from "@prisma/client";

// Doc: Singleton Prisma client instance for database access
const prisma = new PrismaClient();
export default prisma;