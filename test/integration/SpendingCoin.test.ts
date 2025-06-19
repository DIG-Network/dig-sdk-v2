import { Clvm, Simulator } from "chia-wallet-sdk";

describe('Spending wallet coin', () => {
    it('should be able to spend a coin', async () => {
        const sim = new Simulator();
        const clvm = new Clvm();

        // Mint a coin for Alice
        const alice = sim.bls(1000n);

        // Prepare conditions: create a new coin and reserve a fee
        const conditions = [
            clvm.createCoin(alice.puzzleHash, 900n, null),
            clvm.reserveFee(100n),
        ];

        // Create a delegated spend for the coin
        const spend = clvm.delegatedSpend(conditions);

        // Spend the coin using Alice's public key
        clvm.spendStandardCoin(alice.coin, alice.pk, spend);

        // Submit the spend to the simulator
        sim.spendCoins(clvm.coinSpends(), [alice.sk]);
    });
});