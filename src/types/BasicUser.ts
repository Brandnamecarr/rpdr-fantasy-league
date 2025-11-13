export interface User {
    Password: string;
}

export interface DataStructure {
    Users: {
        [key: string]: User;
    }
}