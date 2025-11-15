import fs from 'fs';
import * as path from 'path';
import { UserAuthDataStructure} from '../types/BasicUser';

// reads json file // 
export function readJsonFile(filename: string): UserAuthDataStructure {
    const absolutePath = path.join(process.cwd(), filename);
    console.log(absolutePath);

    const data = fs.readFileSync(absolutePath, 'utf8');
    const obj = JSON.parse(data);
    console.log("obj:");
    console.log(obj);
    return obj as UserAuthDataStructure;
} // readJsonFile //


