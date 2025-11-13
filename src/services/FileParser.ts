import fs from 'fs';

// reads json file // 
export function readJsonFile(filename: string): string {
    const data = fs.readFileSync(filename, 'utf8');
    const obj = JSON.parse(data);
    return obj;
} // readJsonFile //


