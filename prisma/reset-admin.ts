import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'mother@rpdr-fantasy.com';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'MotherKnowsBest!2024';

async function main() {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {
            displayName: 'Admin',
            password: hashedPassword,
        },
        create: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            displayName: 'Admin',
        },
    });

    console.log(`Admin account reset: ${admin.email} (id: ${admin.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
