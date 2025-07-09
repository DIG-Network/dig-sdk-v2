-- CreateTable
CREATE TABLE "Block" (
    "hash" BLOB NOT NULL,
    "blockHeight" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "namespace" TEXT NOT NULL DEFAULT 'default',
    "synced_to_height" INTEGER NOT NULL,
    "synced_to_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Coin" (
    "walletId" TEXT NOT NULL,
    "coinId" BLOB NOT NULL,
    "parentCoinInfo" BLOB NOT NULL,
    "puzzleHash" BLOB NOT NULL,
    "amount" TEXT NOT NULL,
    "syncedHeight" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "assetId" TEXT NOT NULL DEFAULT 'xch',

    PRIMARY KEY ("walletId", "coinId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_key" ON "Wallet"("name");

-- CreateIndex
CREATE INDEX "Coin_walletId_idx" ON "Coin"("walletId");

-- CreateIndex
CREATE INDEX "Coin_status_idx" ON "Coin"("status");

-- CreateIndex
CREATE INDEX "Coin_assetId_idx" ON "Coin"("assetId");
