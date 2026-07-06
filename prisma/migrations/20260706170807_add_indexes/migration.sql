-- CreateIndex
CREATE INDEX "Maintenance_isCompleted_idx" ON "Maintenance"("isCompleted");

-- CreateIndex
CREATE INDEX "Maintenance_type_idx" ON "Maintenance"("type");

-- CreateIndex
CREATE INDEX "Maintenance_createdAt_idx" ON "Maintenance"("createdAt");

-- CreateIndex
CREATE INDEX "Vehicle_state_idx" ON "Vehicle"("state");

-- CreateIndex
CREATE INDEX "Vehicle_type_idx" ON "Vehicle"("type");

-- CreateIndex
CREATE INDEX "Vehicle_createdAt_idx" ON "Vehicle"("createdAt");
