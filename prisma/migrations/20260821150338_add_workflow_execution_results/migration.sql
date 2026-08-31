-- CreateTable
CREATE TABLE "WorkflowExecutionResults" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,

    CONSTRAINT "WorkflowExecutionResults_pkey" PRIMARY KEY ("id")
);
