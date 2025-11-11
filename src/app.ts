/**
 * This file handles main http server
 */

import express, { Request, Response } from 'express';
import {readJsonFile, getString} from "./FileParser";

const app = express();
const PORT = 3000;

// main echo line to verify connectivity
app.get('/', (req: Request, res: Response) => {
//   res.send('Hello from Express + TypeScript 🚀');
    res.send(readJsonFile('database/data.json'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
