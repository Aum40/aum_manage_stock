-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('MANUAL_ADJUSTMENT', 'CHAT_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockMovementSource" AS ENUM ('WEB', 'LINE');

-- CreateEnum
CREATE TYPE "PendingActionSource" AS ENUM ('WEB', 'LINE');

-- CreateEnum
CREATE TYPE "PendingActionIntent" AS ENUM ('ADJUST_STOCK');

-- CreateEnum
CREATE TYPE "StockOperation" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "shopProductId" UUID NOT NULL,
    "actorId" UUID,
    "movementType" "StockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "source" "StockMovementSource" NOT NULL,
    "note" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAction" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "actorId" UUID,
    "source" "PendingActionSource" NOT NULL,
    "originalMessage" TEXT NOT NULL,
    "intent" "PendingActionIntent" NOT NULL,
    "shopProductId" UUID,
    "productQuery" TEXT NOT NULL,
    "operation" "StockOperation" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_shopId_createdAt_idx" ON "StockMovement"("shopId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StockMovement_shopId_shopProductId_createdAt_idx" ON "StockMovement"("shopId", "shopProductId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StockMovement_shopId_actorId_createdAt_idx" ON "StockMovement"("shopId", "actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StockMovement_shopId_movementType_createdAt_idx" ON "StockMovement"("shopId", "movementType", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_referenceType_referenceId_key" ON "StockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "PendingAction_shopId_status_createdAt_idx" ON "PendingAction"("shopId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PendingAction_expiresAt_status_idx" ON "PendingAction"("expiresAt", "status");
