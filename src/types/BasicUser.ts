export interface User {
    Password: string;
}
// don't know if this is the correct implementation but it'll do for now.
// might need a rework later.
export interface UserAuthDataStructure {
    Users: {
        [key: string]: User;
    }
}