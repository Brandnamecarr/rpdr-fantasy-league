import { comparePassword } from "../util/PasswordManager";

// reads username/password data
// returns True or False if user is authenticated or not
export async function authUser(username: string, password: string): Promise<boolean> {
    console.log("Auth.ts::authUser() -> authenticating ${username}");
    try {
        // TODO: Get user's hashed password from DB.
        const tempHashedPassword: string = 'not_yet_implemented';
        let authenticated: boolean = await comparePassword(password, tempHashedPassword);
        return authenticated;
    } // try //
    catch (error) {
        console.error('An error occurred while authenticating user: ', username);
        return false;
    } // catch //

    return true;
}

