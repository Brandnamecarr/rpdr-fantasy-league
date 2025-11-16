import { Request, Response } from "express";

import { PostgresAdapter } from "../services/PostgresAdapter";

export const getUsers = (req: Request, res: Response) => {
    // get users from postgres DB
    res.json({id: 1, name: "Brandon"});
};