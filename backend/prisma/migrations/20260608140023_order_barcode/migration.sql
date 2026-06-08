-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE INDEX "Order_barcode_idx" ON "Order"("barcode");
