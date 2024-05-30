import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrogonBurn } from "../target/types/drogon_burn.js";
import {
    getAccount,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

async function main() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;
    const decimals = 6;
    const tokenMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    const mintDecimals = Math.pow(10, decimals);

    const [drogonAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("drogon_account")],
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
}

main().catch(err => {
    console.error(err);
});
