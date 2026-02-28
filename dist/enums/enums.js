"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanSurveyPoints = exports.LeaguePointAwards = exports.WeeklyBonusPoints = exports.PointManipulation = void 0;
// Doc: Enum definitions for point scoring system in the fantasy league.
// Doc: Defines point values for various placement outcomes, achievements, and penalties.
// Doc: Point values for weekly episode placements and outcomes (both positive and negative)
var PointManipulation;
(function (PointManipulation) {
    // positive changes
    PointManipulation[PointManipulation["MAXI_CHALLENGE_WIN"] = 25] = "MAXI_CHALLENGE_WIN";
    PointManipulation[PointManipulation["SNATCH_GAME_WIN"] = 30] = "SNATCH_GAME_WIN";
    PointManipulation[PointManipulation["MINI_CHALLENGE_WIN"] = 20] = "MINI_CHALLENGE_WIN";
    PointManipulation[PointManipulation["TOP_PLACEMENT"] = 20] = "TOP_PLACEMENT";
    PointManipulation[PointManipulation["SAFE_PLACEMENT"] = 15] = "SAFE_PLACEMENT";
    PointManipulation[PointManipulation["WINS_LIPSYNCH"] = 20] = "WINS_LIPSYNCH";
    PointManipulation[PointManipulation["GOOD_RUNWAY"] = 20] = "GOOD_RUNWAY";
    PointManipulation[PointManipulation["ICONIC_MOMENT"] = 15] = "ICONIC_MOMENT";
    // negative changes
    PointManipulation[PointManipulation["BOTTOM_THREE_PLACEMENT"] = -5] = "BOTTOM_THREE_PLACEMENT";
    PointManipulation[PointManipulation["BOTTOM_TWO_PLACEMENT"] = -10] = "BOTTOM_TWO_PLACEMENT";
    PointManipulation[PointManipulation["ELIMINATED"] = -15] = "ELIMINATED";
    PointManipulation[PointManipulation["BAD_RUNWAY"] = -5] = "BAD_RUNWAY";
    PointManipulation[PointManipulation["CRINGE_MOMENT"] = -5] = "CRINGE_MOMENT";
})(PointManipulation || (exports.PointManipulation = PointManipulation = {})); // PointManipulation Enum //
// Doc: Bonus point values for weekly awards
var WeeklyBonusPoints;
(function (WeeklyBonusPoints) {
    WeeklyBonusPoints[WeeklyBonusPoints["LEAGUE_QUEEN_OF_WEEK"] = 10] = "LEAGUE_QUEEN_OF_WEEK";
})(WeeklyBonusPoints || (exports.WeeklyBonusPoints = WeeklyBonusPoints = {})); // WeeklyBonusPoints Enum //
// Doc: Point values for end-of-season league awards
var LeaguePointAwards;
(function (LeaguePointAwards) {
    LeaguePointAwards[LeaguePointAwards["MOST_IMPROVED"] = 10] = "MOST_IMPROVED";
    LeaguePointAwards[LeaguePointAwards["MISS_CONGENIALITY"] = 20] = "MISS_CONGENIALITY";
    LeaguePointAwards[LeaguePointAwards["TRADE_OF_THE_SEASON"] = 15] = "TRADE_OF_THE_SEASON";
    LeaguePointAwards[LeaguePointAwards["FAN_FAVORITE"] = 10] = "FAN_FAVORITE";
})(LeaguePointAwards || (exports.LeaguePointAwards = LeaguePointAwards = {})); // LeaguePointAwards Enum//
// Doc: Point values awarded/deducted based on fan survey vote winners (plurality-wins per category)
var FanSurveyPoints;
(function (FanSurveyPoints) {
    FanSurveyPoints[FanSurveyPoints["QUEEN_OF_WEEK"] = 10] = "QUEEN_OF_WEEK";
    FanSurveyPoints[FanSurveyPoints["BOTTOM_OF_WEEK"] = -5] = "BOTTOM_OF_WEEK";
    FanSurveyPoints[FanSurveyPoints["LIP_SYNC_WINNER"] = 20] = "LIP_SYNC_WINNER";
    FanSurveyPoints[FanSurveyPoints["BEST_DRESSED"] = 20] = "BEST_DRESSED";
    FanSurveyPoints[FanSurveyPoints["WORST_DRESSED"] = -5] = "WORST_DRESSED"; // most fan votes for worst runway look
})(FanSurveyPoints || (exports.FanSurveyPoints = FanSurveyPoints = {})); // FanSurveyPoints Enum //
// export enum QueenStatus {
//     ACTIVE,
//     ELIMINATED,
//     WINNER,
//     MISS_CONGENIALITY,
//     UNKNOWN_OR_ERROR,
//     RUNNERUP
// } //QueenStatus Enum//
