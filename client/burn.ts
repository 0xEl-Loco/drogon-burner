import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrogonBurn } from "../target/types/drogon_burn.js";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from 'bn.js';

export async function burn() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;
    const DROGON_SEED = 'drogon_account';

    const [drogonAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(DROGON_SEED)],
        program.programId
    );

    const maxRetries = 5;
    const delay = 2000; // 2 seconds
    let tx: string | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Fetch the current drogon account details to get the token mint address
            const drogonAccount = await program.account.drogonAccount.fetch(drogonAccountPda);

            // Trigger the burn transaction
            tx = await program.methods.burnTokens()
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
            break; // Exit the loop if the transaction is successful
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                console.error('Max retries reached. Exiting.');
                throw error;
            }
            console.log(`Retrying transaction...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (!tx) {
        throw new Error('Failed to submit transaction.');
    }

    // Fetch the transaction details to get the token balance changes
    let txDetails: anchor.web3.ParsedTransactionWithMeta | null = null;
    for (let i = 0; i < maxRetries; i++) {
        txDetails = await provider.connection.getParsedTransaction(tx, "confirmed");
        if (txDetails !== null) break;
        console.log(`Retrying to fetch transaction details (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!txDetails) {
        throw new Error('Failed to fetch transaction details after several retries.');
    }

    const preTokenBalances = txDetails.meta?.preTokenBalances || [];
    const postTokenBalances = txDetails.meta?.postTokenBalances || [];

    let preBalance = 0;
    let postBalance = 0;

    preTokenBalances.forEach(balance => {
        if (balance.uiTokenAmount.uiAmount !== null) {
            preBalance += balance.uiTokenAmount.uiAmount;
            console.log(`Balance - pre Tx : ${balance.uiTokenAmount.uiAmountString}`);
        }
    });

    postTokenBalances.forEach(balance => {
        if (balance.uiTokenAmount.uiAmount !== null) {
            postBalance += balance.uiTokenAmount.uiAmount;
            console.log(`Balance - post Tx : ${balance.uiTokenAmount.uiAmountString}`);
        }
    });

    const burn = preBalance - postBalance;
    console.log(`Burned with Tx: ${burn.toString()}`);
}

// Call the function (for example, in your main script)
burn().catch(console.error);
