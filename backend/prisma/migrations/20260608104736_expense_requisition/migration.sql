-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "mdApprovedAt" TIMESTAMP(3),
ADD COLUMN     "mdApprovedById" TEXT,
ADD COLUMN     "mdApprovedByName" TEXT,
ADD COLUMN     "mdRemarks" TEXT,
ADD COLUMN     "requisitionNumber" TEXT,
ADD COLUMN     "requisitionStatus" TEXT DEFAULT 'none';
