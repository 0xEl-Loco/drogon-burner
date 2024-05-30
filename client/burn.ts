import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrogonBurn } from "../target/types/drogon_burn.js";
import { PublicKey } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import BN from 'bn.js';

async function burn() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;
    const DROGON_SEED = 'drogon_account';

    const [drogonAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(DROGON_SEED)],
        program.programId
    );

    try {
        // Fetch the current drogon account details to get the token mint address
        const drogonAccount = await program.account.drogonAccount.fetch(drogonAccountPda);
        const initialTotalBurned = new BN(drogonAccount.totalBurned);

        // Trigger the burn transaction
        const tx = await program.methods.burnTokens()
            .accounts({
                drogonAccount: drogonAccountPda,
                burnScheduleAccount: drogonAccount.burnScheduleAccount,
                sender: provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                escrowWalletAccount: drogonAccount.escrowWalletAccount,
                tokenMint: drogonAccount.tokenMint, // Use the token mint from the fetched drogon account
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        console.log("Transaction signature:", tx);

        // Fetch the updated drogon account details to get the total amount burned
        const updatedDrogonAccount = await program.account.drogonAccount.fetch(drogonAccountPda);
        const finalTotalBurned = new BN(updatedDrogonAccount.totalBurned);
        // Calculate the amount burned in this transaction
        const amountBurned = finalTotalBurned.sub(initialTotalBurned);
        console.log(`Total Amount Burned: ${amountBurned}`);
    } catch (error) {
        console.error('Error burning tokens:', error);
    }
}

// Call the function (for example, in your main script)
burn().catch(console.error);
