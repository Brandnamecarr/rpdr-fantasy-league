// Doc: Server entry point that starts the Express application.
// Doc: Imports the configured app and starts listening on port 3000.
import app from "./app";
import logger from "./util/LoggerImpl";
import { startSurveyScheduler } from "./util/surveyScheduler";

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
    logger.info(`Server.ts running on port ${PORT}.`);
    startSurveyScheduler();
});