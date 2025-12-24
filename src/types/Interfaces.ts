// defines some common interfaces //

import { QueenStatus } from "@prisma/client";

export interface QueenInput {
    name: string;
    franchise: string;
    season: number;
    location: string;
    status: QueenStatus;
}