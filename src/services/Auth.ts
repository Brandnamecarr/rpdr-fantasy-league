import { readJsonFile } from "./FileParser";

// reads username/password data
// returns True or False if user is authenticated or not
export async function authUser(username: string, password: string): Promise<boolean> {
    console.log("Auth.ts::authUser() -> authenticating ${username}");
    try {
        console.log('about to readJsonFile');
        const users = readJsonFile('database/users.json');
        console.log('printing users:');
        console.log(users);
        // if(users.length == 0)
        //     {
        //         console.log('length of users is 0!');
        //     }
        // else {
        //     console.log(users.length);
        // }
        // const temp = JSON.parse(users);
        const user = users.Users[username];
        // TODO: More validation here.
        if (user.Password == password) {
            console.log('passwords match. returning true');
            return true;
        }
        else
        {
            console.log('Passwords dont match');
            return false;
        }
    } // try //
    catch (error) {
        console.error('An error occurred while authenticating user: ', username);
        return false;
    } // catch //

    return true;
}

