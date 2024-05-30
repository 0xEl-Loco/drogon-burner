import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrogonBurn } from "../target/types/drogon_burn";
import {
    getAccount,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from 'bn.js';
import { assert } from "chai";

describe("drogon-burn", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;
    const tokenMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    const decimals = 6;
    const mintDecimals = Math.pow(10, decimals);
    const DROGON_SEED = 'drogon_account';

    it("initializes accounts and handles burn error", async () => {
        // Initialize Drogon Account
        const [drogonAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from(DROGON_SEED)],
            program.programId
        );

        const [escrowWalletAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("escrow_wallet_account")],
            program.programId
        );

        const [burnScheduleAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("burn_schedule_account")],
            program.programId
        );

        const tokenAccount = getAssociatedTokenAddressSync(
            tokenMint,
            provider.wallet.publicKey
        );

        console.log("tokenAccount: " + tokenAccount.toString());
        console.log("DrogonAccountOwnerPda: " + drogonAccount.toString());

        let tokenAccountInfo = await getAccount(provider.connection, tokenAccount);
        console.log(
            "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
        );

        console.log("EscrowAccount: " + escrowWalletAccount.toString());

        // Call initializeDrogonAccount
        let tx = await program.methods.initializeDrogonAccount()
            .accounts({
                drogonAccount: drogonAccount,
                sender: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                walletToWithdrawFrom: tokenAccount,
                escrowWalletAccount: escrowWalletAccount,
                tokenMint: tokenMint,
            })
            .rpc();
        console.log("initializeDrogonAccount transaction signature", tx);

        // Call initializeTransferToEscrow
        tx = await program.methods.initializeTransferToEscrow()
            .accounts({
                drogonAccount: drogonAccount,
                sender: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                walletToWithdrawFrom: tokenAccount,
                escrowWalletAccount: escrowWalletAccount,
                tokenMint: tokenMint,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
        console.log("initializeTransferToEscrow transaction signature", tx);

        // Call initializeBurnSchedule
        tx = await program.methods.initializeBurnSchedule()
            .accounts({
                drogonAccount: drogonAccount,
                burnScheduleAccount: burnScheduleAccount,
                sender: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();
        console.log("initializeBurnSchedule transaction signature", tx);

        // Verify the drogon account is initialized correctly
        const drogonAccountInfo = await program.account.drogonAccount.fetch(drogonAccount);
        assert.isNotNull(drogonAccountInfo, "Drogon account should be initialized");

        // Attempt to burn tokens and handle expected error
        try {
            const txBurn = await program.methods.burnTokens()
                .accounts({
                    drogonAccount: drogonAccount,
                    burnScheduleAccount: burnScheduleAccount,
                    sender: provider.wallet.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    escrowWalletAccount: escrowWalletAccount,
                    tokenMint: tokenMint,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            console.log("Burn transaction signature:", txBurn);

            // Fetch the updated drogon account details to get the total amount burned
            const updatedDrogonAccount = await program.account.drogonAccount.fetch(drogonAccount);
            const finalTotalBurned = new BN(updatedDrogonAccount.totalBurned);

            // Calculate the amount burned in this transaction
            const amountBurned = finalTotalBurned.sub(new BN(drogonAccountInfo.totalBurned));
            console.log(`Total Amount Burned: ${amountBurned}`);

            // Verify the tokens were burned
            assert(amountBurned.gt(new BN(0)), "Tokens should be burned");
        } catch (err) {
            console.log("Expected error: ", err.toString());
            assert.include(err.toString(), "The burn has not started. No relevant event found.");
        }
    });
});
