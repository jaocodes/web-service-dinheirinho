/*
  Warnings:

  - You are about to drop the column `balance` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `transactions` table. All the data in the column will be lost.
  - Made the column `description` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "balance",
ADD COLUMN     "currentBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initialBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "title",
ADD COLUMN     "observations" TEXT,
ALTER COLUMN "description" SET NOT NULL;
