// Doc: Server entry point that starts the Express application.
// Doc: Imports the configured app and starts listening on port 3000.
import app from "./app";
import logger from "./util/LoggerImpl";

// Doc: Server port configuration
const PORT = 3000;

// Doc: Starts the Express server listening on the specified port
app.listen(PORT, () => {
    console.log(`Server.ts running at http://www.localhost/${PORT}.`);
});