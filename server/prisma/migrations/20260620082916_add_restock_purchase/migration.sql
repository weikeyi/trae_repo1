-- CreateTable
CREATE TABLE "RestockSuggestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sparePartId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "lockedQty" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "pendingRequestQty" INTEGER NOT NULL DEFAULT 0,
    "inTransitQty" INTEGER NOT NULL DEFAULT 0,
    "consumption30d" INTEGER NOT NULL DEFAULT 0,
    "suggestedQty" INTEGER NOT NULL DEFAULT 0,
    "expectedGap" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purchasePlanId" INTEGER,
    "convertedById" INTEGER,
    "convertedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestockSuggestion_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RestockSuggestion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RestockSuggestion_purchasePlanId_fkey" FOREIGN KEY ("purchasePlanId") REFERENCES "PurchasePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RestockSuggestion_convertedById_fkey" FOREIGN KEY ("convertedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchasePlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "storeId" INTEGER NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL DEFAULT 0,
    "remark" TEXT,
    "createdById" INTEGER NOT NULL,
    "submittedById" INTEGER,
    "submittedAt" DATETIME,
    "approvedById" INTEGER,
    "approvedAt" DATETIME,
    "rejectedById" INTEGER,
    "rejectedAt" DATETIME,
    "rejectReason" TEXT,
    "cancelledById" INTEGER,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchasePlan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlan_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlan_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlan_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchasePlanItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "planQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL DEFAULT 0,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchasePlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PurchasePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchasePlanItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receiptNo" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdById" INTEGER NOT NULL,
    "confirmedById" INTEGER,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseReceipt_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PurchasePlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceipt_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receiptId" INTEGER NOT NULL,
    "planItemId" INTEGER NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceiptItem_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PurchasePlanItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceiptItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventoryLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sparePartId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "lockedQtyBefore" INTEGER NOT NULL,
    "lockedQtyAfter" INTEGER NOT NULL,
    "availableQtyBefore" INTEGER NOT NULL,
    "availableQtyAfter" INTEGER NOT NULL,
    "relatedTicketId" INTEGER,
    "relatedRequestId" INTEGER,
    "relatedTransferId" INTEGER,
    "relatedPurchasePlanId" INTEGER,
    "relatedPurchaseReceiptId" INTEGER,
    "operatorId" INTEGER NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryLog_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_relatedPurchasePlanId_fkey" FOREIGN KEY ("relatedPurchasePlanId") REFERENCES "PurchasePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_relatedPurchaseReceiptId_fkey" FOREIGN KEY ("relatedPurchaseReceiptId") REFERENCES "PurchaseReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryLog" ("availableQtyAfter", "availableQtyBefore", "changeType", "createdAt", "id", "lockedQtyAfter", "lockedQtyBefore", "operatorId", "quantityAfter", "quantityBefore", "relatedRequestId", "relatedTicketId", "relatedTransferId", "remark", "sparePartId", "storeId") SELECT "availableQtyAfter", "availableQtyBefore", "changeType", "createdAt", "id", "lockedQtyAfter", "lockedQtyBefore", "operatorId", "quantityAfter", "quantityBefore", "relatedRequestId", "relatedTicketId", "relatedTransferId", "remark", "sparePartId", "storeId" FROM "InventoryLog";
DROP TABLE "InventoryLog";
ALTER TABLE "new_InventoryLog" RENAME TO "InventoryLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RestockSuggestion_sparePartId_storeId_status_key" ON "RestockSuggestion"("sparePartId", "storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePlan_planNo_key" ON "PurchasePlan"("planNo");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePlanItem_planId_sparePartId_key" ON "PurchasePlanItem"("planId", "sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_receiptNo_key" ON "PurchaseReceipt"("receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceiptItem_receiptId_planItemId_key" ON "PurchaseReceiptItem"("receiptId", "planItemId");
