ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_shopProductId_fkey"
FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PendingAction"
ADD CONSTRAINT "PendingAction_shopProductId_fkey"
FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "shops"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_shopProductId_fkey"
FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
