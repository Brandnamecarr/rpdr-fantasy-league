import prisma from "../db/prisma.client";
import logger from "../util/LoggerImpl";

// gets all notifs sent to the email //
export const getAllByUser = (email: string) => {
    return prisma.notification.findMany({
        where: {
            destination: email,
        },
    });
};

// gets all Active notifications associated with the email //
export const getAllActiveNotifs = (email: string) => {
    return prisma.notification.findMany({
        where: {
            destination: email,
            resolved: false,
        },
    });
};