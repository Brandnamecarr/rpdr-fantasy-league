-- CreateIndex
CREATE INDEX "Notification_destination_idx" ON "Notification"("destination");

-- CreateIndex
CREATE INDEX "Notification_destination_resolved_idx" ON "Notification"("destination", "resolved");
