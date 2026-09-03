CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

ALTER TYPE "StockMovementType" ADD VALUE 'SALE';
ALTER TYPE "StockMovementType" ADD VALUE 'SALE_VOID';

CREATE TABLE "Sale" (
  "id" UUID NOT NULL,
  "shopId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "note" TEXT,
  "voidedById" UUID,
  "voidReason" TEXT,
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleItem" (
  "id" UUID NOT NULL,
  "saleId" UUID NOT NULL,
  "shopProductId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sale_shopId_createdAt_idx" ON "Sale"("shopId", "createdAt" DESC);
CREATE INDEX "Sale_shopId_status_createdAt_idx" ON "Sale"("shopId", "status", "createdAt" DESC);
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_shopProductId_idx" ON "SaleItem"("shopProductId");
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
