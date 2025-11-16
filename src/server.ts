import app from "./app";

const PORT = 3000;

app.listen(PORT, () => {
    console.log('Server.ts running at http://www.localhost/${PORT}.');
});