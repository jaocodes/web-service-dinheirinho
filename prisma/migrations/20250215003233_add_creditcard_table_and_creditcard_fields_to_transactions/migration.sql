-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CREDIT';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "billingCycle" TIMESTAMP(3),
ADD COLUMN     "creditCardId" TEXT,
ADD COLUMN     "installmentId" TEXT,
ADD COLUMN     "installmentNum" INTEGER,
ADD COLUMN     "installments" INTEGER;

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
