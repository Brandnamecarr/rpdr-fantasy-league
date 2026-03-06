// Doc: Server entry point that starts the Express application.
// Doc: Imports the configured app and starts listening on port 3000.
import app from "./app";
import logger from "./util/LoggerImpl";

// Doc: Server port — reads from PORT env var so Fargate task definition controls it.
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Doc: Starts the Express server listening on the specified port
app.listen(PORT, () => {
    console.log(`Server.ts running on port ${PORT}.`);
});