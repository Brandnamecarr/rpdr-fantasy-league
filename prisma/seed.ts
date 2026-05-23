import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Admin credentials sourced from env vars.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'MOTHER@RPDR-FANTASY.COM').toUpperCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'MotherKnowsBest!2024';

async function main() {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
        console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
        return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await prisma.user.create({
        data: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            displayName: 'Admin',
        },
    });

    console.log(`Admin account created: ${admin.email} (id: ${admin.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
