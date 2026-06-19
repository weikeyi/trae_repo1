-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "storeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicianProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "skills" TEXT NOT NULL,
    "regions" TEXT NOT NULL,
    "maxLoad" INTEGER NOT NULL DEFAULT 5,
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT,
    "managerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "category" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "purchaseDate" DATETIME,
    "lastMaintenanceDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SlaRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "urgency" TEXT NOT NULL,
    "responseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "escalationMinutes" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RepairTicket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketNo" TEXT NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "faultType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "expectedTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "diagnosis" TEXT,
    "repairResult" TEXT,
    "rejectReason" TEXT,
    "mergedTicketId" INTEGER,
    "slaDeadline" DATETIME,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "arrivedAt" DATETIME,
    "completedAt" DATETIME,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepairTicket_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairTicket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RepairTicket_mergedTicketId_fkey" FOREIGN KEY ("mergedTicketId") REFERENCES "RepairTicket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StatusHistory_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sparePartId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lockedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inventory_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparePartRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestNo" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "requestQty" INTEGER NOT NULL,
    "fulfilledQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fromStoreId" INTEGER,
    "toStoreId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparePartRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartRequest_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartRequest_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SparePartRequest_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SparePartRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transferNo" TEXT NOT NULL,
    "requestId" INTEGER NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "fromStoreId" INTEGER NOT NULL,
    "toStoreId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "operatorId" INTEGER NOT NULL,
    "shippedAt" DATETIME,
    "receivedAt" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transfer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SparePartRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "targetId" INTEGER,
    "targetType" TEXT,
    "operatorId" INTEGER NOT NULL,
    "detail" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeCode_key" ON "Store"("storeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_equipmentCode_key" ON "Equipment"("equipmentCode");

-- CreateIndex
CREATE UNIQUE INDEX "SlaRule_urgency_key" ON "SlaRule"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "RepairTicket_ticketNo_key" ON "RepairTicket"("ticketNo");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_partCode_key" ON "SparePart"("partCode");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_sparePartId_storeId_key" ON "Inventory"("sparePartId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartRequest_requestNo_key" ON "SparePartRequest"("requestNo");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_transferNo_key" ON "Transfer"("transferNo");
