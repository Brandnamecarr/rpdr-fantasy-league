import fs from 'fs';

export function readJsonFile(filename: string): string {
    const data = fs.readFileSync(filename, 'utf8');
    const obj = JSON.parse(data);
    return obj + "TESTTTT";
}

export function getString(): string {
    return "hello, from getString()!";
}