// Doc: Enum definitions for point scoring system in the fantasy league.
// Doc: Defines point values for various placement outcomes, achievements, and penalties.
// Doc: Point values for weekly episode placements and outcomes (both positive and negative)
export enum PointManipulation {
    // positive changes
    MAXI_CHALLENGE_WIN = 25,
    SNATCH_GAME_WIN = 30,
    MINI_CHALLENGE_WIN = 20,
    TOP_PLACEMENT = 20,
    SAFE_PLACEMENT = 15,
    WINS_LIPSYNCH = 20,
    GOOD_RUNWAY = 20, // toot //
    ICONIC_MOMENT = 15,

    // negative changes
    BOTTOM_THREE_PLACEMENT = -5,
    BOTTOM_TWO_PLACEMENT = -10,
    ELIMINATED = -15,
    BAD_RUNWAY = -5, // boot // 
    CRINGE_MOMENT = -5
} // PointManipulation Enum //

// Doc: Bonus point values for weekly awards
export enum WeeklyBonusPoints {
    LEAGUE_QUEEN_OF_WEEK = 10
} // WeeklyBonusPoints Enum //

// Doc: Point values for end-of-season league awards
export enum LeaguePointAwards {
    MOST_IMPROVED = 10,
    MISS_CONGENIALITY = 20,
    TRADE_OF_THE_SEASON = 15,
    FAN_FAVORITE = 10
} // LeaguePointAwards Enum//

// Doc: Point values awarded/deducted based on fan survey vote winners (plurality-wins per category)
export enum FanSurveyPoints {
    QUEEN_OF_WEEK   =  10,  // most fan votes for queen of the week
    BOTTOM_OF_WEEK  =  -5,  // most fan votes for worst of the week
    LIP_SYNC_WINNER =  20,  // most fan votes for lip sync winner
    BEST_DRESSED    =  20,  // most fan votes for best runway look
    WORST_DRESSED   =  -5   // most fan votes for worst runway look
} // FanSurveyPoints Enum //

// export enum QueenStatus {
//     ACTIVE,
//     ELIMINATED,
//     WINNER,
//     MISS_CONGENIALITY,
//     UNKNOWN_OR_ERROR,
//     RUNNERUP
// } //QueenStatus Enum//