/*
  Warnings:

  - You are about to drop the column `billingCycle` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "billingCycle",
ADD COLUMN     "invoiceDate" TIMESTAMP(3);
