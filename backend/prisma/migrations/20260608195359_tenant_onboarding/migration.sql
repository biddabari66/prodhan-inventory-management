-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "country" TEXT,
ADD COLUMN     "employeeCount" TEXT,
ADD COLUMN     "hearAboutUs" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;
