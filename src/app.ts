/**
 * This file handles main http server
 */

// express imports //
import express, { raw, Request, Response } from 'express';
import * as fs from 'fs';

// application imports // 
import {readJsonFile} from "./services/FileParser";
import { LoginRequest } from './types/CustomRequests';
import { authUser } from './services/Auth';
import {UserAuthDataStructure, User} from './types/BasicUser';
import { registerUser } from './services/User';
import { PostgresAdapter } from './services/PostgresAdapter';

// app stuff
const app = express();
const PORT = 3000;

app.use(express.json());

async function doPGTest(): Promise<boolean> {
    const pgData = fs.readFileSync('config/pg_config.json', 'utf-8');
    const parsedData = JSON.parse(pgData);
    console.log(parsedData);

    const dbService = new PostgresAdapter(parsedData);
    let result = await dbService.testConnection();
    if(result) {
      return true;
    }
    return false;
}

// main echo line to verify connectivity
app.get('/', async (req: Request, res: Response) => {
//   res.send('Hello from Express + TypeScript 🚀');
    // res.send(readJsonFile('database/data.json'));

    // let data: DataStructure = readJsonFile('database/users.json');
    // const rawData = fs.readFileSync('database/users.json', 'utf-8');
    // const data: UserAuthDataStructure = JSON.parse(rawData);
    // const user = data.Users['Hannah'];
    // res.send({
    //   username: "Hannah",
    //   password: user.Password
    // });
    
    let result = await doPGTest();
    if (result) {
      res.send('CONNECTED TO PG');
    }
    else {
      res.send('NOT CONNECTED TO PG');
    }
}); // home route // 

// status page of services and testing results //
app.get('/statusPage', (req: Request, res: Response) => {
  res.send('TODO: Implement statusPage');
}); // statusPage route //

// authentication route //
app.post('/auth', async (req: LoginRequest, res: Response) => {
  console.log(req.body);
  const { username, password } = req.body;
  console.log(username);
  console.log(password);

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

// registration route //
app.get('/userRegistration', async (req, res) => {
  res.send('TODO: Implement userRegistration');
}); // userRegistration //

// league creation route //
app.get('/createNewLeague', async (req, res) => {
  res.send('TODO: Implement leagueCreation (eventually');
}); // leagueCreation //

app.listen(PORT, () => {
  console.log(`✅ Server running at http://127.0.0.1:${PORT}`);
});
