-- CreateTable
CREATE TABLE "Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" REAL NOT NULL,
    "currentOdometer" REAL NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledOdometer" REAL,
    "scheduledDate" DATETIME,
    "completedDate" DATETIME,
    "cost" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Maintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Maintenance_vehicleId_idx" ON "Maintenance"("vehicleId");
