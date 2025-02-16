/*
  Warnings:

  - You are about to drop the column `limit` on the `credit_cards` table. All the data in the column will be lost.
  - Added the required column `currentLimit` to the `credit_cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialLimit` to the `credit_cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "credit_cards" DROP COLUMN "limit",
ADD COLUMN     "currentLimit" INTEGER NOT NULL,
ADD COLUMN     "initialLimit" INTEGER NOT NULL;
