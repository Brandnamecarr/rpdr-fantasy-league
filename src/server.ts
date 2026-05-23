import 'dotenv/config';
import app from "./app";
import logger from "./util/LoggerImpl";
import { startSurveyScheduler } from "./util/surveyScheduler";

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
    logger.info(`Server.ts running on port ${PORT}.`);
    startSurveyScheduler();
});