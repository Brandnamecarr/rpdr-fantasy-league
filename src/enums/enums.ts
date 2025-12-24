
// ways to add points
export enum PointManipulation {
    // positive changes
    MAXI_CHALLENGE_WIN = 15,
    SNATCH_GAME_WIN = 20,
    MINI_CHALLENGE_WIN = 10,
    TOP_PLACEMENT = 10,
    SAFE_PLACEMENT = 5,
    WINS_LIPSYNCH = 10,
    GOOD_RUNWAY = 10, // toot //
    ICONIC_MOMENT = 5,

    // negative changes
    BOTTOM_THREE_PLACEMENT = -5,
    BOTTOM_TWO_PLACEMENT = -10,
    ELIMINATED = -15,
    BAD_RUNWAY = -5, // boot // 
    CRINGE_MOMENT = -5
} // PointManipulation Enum // 

// Ways to earn bonus points // 
export enum WeeklyBonusPoints {
    LEAGUE_QUEEN_OF_WEEK = 10
} // WeeklyBonusPoints Enum //

// League Enum // 
export enum LeaguePointAwards {
    MOST_IMPROVED = 10,
    MISS_CONGENIALITY = 20,
    TRADE_OF_THE_SEASON = 15,
    FAN_FAVORITE = 10
} // LeaguePointAwards Enum//

export enum QueenStatus {
    ACTIVE,
    ELIMINATED,
    WINNER,
    MISS_CONGENIALITY,
    UNKNOWN_OR_ERROR,
    RUNNERUP
} //QueenStatus Enum//