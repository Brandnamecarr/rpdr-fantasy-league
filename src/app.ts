/**
 * This file handles main http server
 */

// express imports //
import express, { raw, Request, Response } from 'express';
import * as fs from 'fs';

// application imports // 
import {readJsonFile} from "./services/FileParser";
import { LoginRequest } from './types/CustomRequests';
import { authUser, registerUser } from './services/Auth';
import {DataStructure, User} from './types/BasicUser';

// app stuff
const app = express();
const PORT = 3000;

// main echo line to verify connectivity
app.get('/', (req: Request, res: Response) => {
//   res.send('Hello from Express + TypeScript 🚀');
    // res.send(readJsonFile('database/data.json'));

    // let data: DataStructure = readJsonFile('database/users.json');
    const rawData = fs.readFileSync('database/users.json', 'utf-8');
    const data: DataStructure = JSON.parse(rawData);
    const user = data.Users['Hannah'];
    res.send({
      username: "Hannah",
      password: user.Password
    });
}); // home route // 

// status page of services and testing results //
app.get('/statusPage', (req: Request, res: Response) => {
  res.send('TODO: Implement statusPage');
}); // statusPage route //

// authentication route //
app.post('/auth', async (req: LoginRequest, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Missing required fields: username and password must be provided"
    });
  } // if //

  try {
    const isAuthenticated = await authUser(username, password);

    if (isAuthenticated) {
      return res.status(200).json({
        message: 'Login Successful'
      })
    } // if //
    else
    {
      return res.status(400).json({
        message: "Invalid Username or password"
      });
    } // else // 
  } // try //
  catch(error) {
    console.log('Error authenticating user: ', username);
    console.log(error);
  } // catch //
  
}); // /auth //

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
