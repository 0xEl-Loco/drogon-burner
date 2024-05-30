import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrogonBurn } from "../target/types/drogon_burn.js";
import { PublicKey } from "@solana/web3.js";
import BN from 'bn.js';

function formatTimestamp(timestamp) {
    const date = new Date(timestamp.toNumber() * 1000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (UTC)`;
}

async function viewDrogonAccount() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;

    const SEED = 'drogon_account'; // Use the same seed you used in the init function

    const [drogonAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(SEED)],
        program.programId
    );

    try {
        const drogonAccount = await program.account.drogonAccount.fetch(drogonAccountPda);

        console.log(`DrogonAccount Pubkey: ${drogonAccountPda.toBase58()}`);
        const formattedInitiationTime = formatTimestamp(new BN(drogonAccount.initiationTime));
        console.log(`Drogon initialized ?: ${drogonAccount.drogonInitialized}`);
        console.log(`Token transfered ?: ${drogonAccount.tokensTransferedToEscrow}`);
        console.log(`Burn schedule initialized ?: ${drogonAccount.burnScheduleInitialized}`);
        console.log(`Total Burned: ${drogonAccount.totalBurned}`);
        console.log(`Initializer: ${drogonAccount.initializer.toBase58()}`);
        console.log(`Escrow Wallet Account: ${drogonAccount.escrowWalletAccount.toBase58()}`);
        console.log(`Wallet to Withdraw From: ${drogonAccount.walletToWithdrawFrom.toBase58()}`);
        console.log(`Token Mint: ${drogonAccount.tokenMint.toBase58()}`);
        console.log(`Burn Schedule Account: ${drogonAccount.burnScheduleAccount.toBase58()}`);
        console.log(`Initiation Time: ${formattedInitiationTime}`);
    } catch (error) {
        console.error('Error fetching drogon account:', error);
    }
}

// Call the function (for example, in your main script)
viewDrogonAccount().catch(console.error);
