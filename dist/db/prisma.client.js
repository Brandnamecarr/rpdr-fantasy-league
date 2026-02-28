"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Doc: Prisma database client singleton instance.
// Doc: Exports a configured PrismaClient for database operations throughout the application.
const client_1 = require("@prisma/client");
// Doc: Singleton Prisma client instance for database access
const prisma = new client_1.PrismaClient();
exports.default = prisma;
