/*
  Warnings:

  - You are about to drop the column `effectiveDate` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "effectiveDate",
ADD COLUMN     "effectived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fixedId" TEXT,
ADD COLUMN     "isFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
