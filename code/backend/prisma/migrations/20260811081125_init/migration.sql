-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexedStake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainPositionId" BIGINT NOT NULL,
    "planId" BIGINT NOT NULL,
    "amount" TEXT NOT NULL,
    "stakeTxHash" TEXT NOT NULL,
    "unstakeTxHash" TEXT,
    "rewardPaid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startBlock" BIGINT NOT NULL,
    "unlockTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexedStake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexedBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "epoch" BIGINT NOT NULL,
    "position" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "betTxHash" TEXT NOT NULL,
    "claimTxHash" TEXT,
    "payout" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexedBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "epoch" BIGINT,
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACCRUED',
    "accrualTxHash" TEXT NOT NULL,
    "claimTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorRole" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerCursor" (
    "contractAddress" TEXT NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("contractAddress")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_nonce_key" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_userAddress_idx" ON "AuthNonce"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedStake_stakeTxHash_key" ON "IndexedStake"("stakeTxHash");

-- CreateIndex
CREATE INDEX "IndexedStake_userId_idx" ON "IndexedStake"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedBet_betTxHash_key" ON "IndexedBet"("betTxHash");

-- CreateIndex
CREATE INDEX "IndexedBet_userId_idx" ON "IndexedBet"("userId");

-- CreateIndex
CREATE INDEX "IndexedBet_epoch_idx" ON "IndexedBet"("epoch");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPayout_accrualTxHash_key" ON "ReferralPayout"("accrualTxHash");

-- CreateIndex
CREATE INDEX "ReferralPayout_userId_idx" ON "ReferralPayout"("userId");

-- CreateIndex
CREATE INDEX "ReferralPayout_claimTxHash_idx" ON "ReferralPayout"("claimTxHash");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthNonce" ADD CONSTRAINT "AuthNonce_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexedStake" ADD CONSTRAINT "IndexedStake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexedBet" ADD CONSTRAINT "IndexedBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
