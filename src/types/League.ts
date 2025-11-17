import { User } from "./User";
import { Queen } from "./Queen";

export class League {
    leagueName: string;
    maxPlayers: number;
    usersInLeague: Array<User>;
    leagueOwner: User;

    constructor(leagueName: string, maxPlayers: number, usersInLeague: Array<User>, leagueOwner: User) {
        this.leagueName = leagueName;
        this.maxPlayers = maxPlayers;
        this.usersInLeague = usersInLeague;
        this.leagueOwner = leagueOwner;
    }

    // adds the user to the 
    addUsersToLeague(user: User): boolean {
        if(this.usersInLeague.length <= this.maxPlayers) {
            this.usersInLeague.push(user);
            return true;
        }
        return false;
    }

    removeUserFromLeague(user: User): boolean {
        return false;
    }
}