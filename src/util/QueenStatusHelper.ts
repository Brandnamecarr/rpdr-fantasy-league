import * as ENUMS from '../enums/enums';
/**
 * Don't think this is being used since code is using the QueenStatus enum defined in the prisma client not this...
 */

export function resolveQueenStatus(status: string): ENUMS.QueenStatus {
    let statusAsEnum: ENUMS.QueenStatus = ENUMS.QueenStatus.ACTIVE;

    switch(status) {
        case 'active' || 'ACTIVE':
            statusAsEnum = ENUMS.QueenStatus.ACTIVE;
            break;
        case 'eliminated' || 'ELIMINATED':
            statusAsEnum = ENUMS.QueenStatus.ELIMINATED;
            break;
        case 'winner' || 'WINNER':
            statusAsEnum = ENUMS.QueenStatus.WINNER;
            break;
        case 'mscongeniality' || 'MSCONGENIALITY':
            statusAsEnum = ENUMS.QueenStatus.MISS_CONGENIALITY;
            break;
        case 'runnerup' || 'RUNNERUP':
            statusAsEnum = ENUMS.QueenStatus.RUNNERUP;
            break;
        case '':
        default:
            statusAsEnum = ENUMS.QueenStatus.UNKNOWN_OR_ERROR;
            break;
    }
    return statusAsEnum;
}

export function convertStatusEnum(statusAsEnum: ENUMS.QueenStatus): string {
    let statusAsString: string = '';

    switch(statusAsEnum) {
        case ENUMS.QueenStatus.ACTIVE:
            statusAsString = 'ACTIVE';
            break;
        case ENUMS.QueenStatus.ELIMINATED:
            statusAsString = 'ELIMINATED';
            break;
        case ENUMS.QueenStatus.WINNER:
            statusAsString = 'WINNER';
            break;
        case ENUMS.QueenStatus.MISS_CONGENIALITY:
            statusAsString = 'MSCONGENIALITY';
            break;
        case ENUMS.QueenStatus.RUNNERUP:
            statusAsString = 'RUNNERUP';
            break;
        case ENUMS.QueenStatus.UNKNOWN_OR_ERROR:
        default:
            statusAsString = '';
            break;
    }
    return statusAsString;
}