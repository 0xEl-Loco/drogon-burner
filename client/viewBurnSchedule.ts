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

async function viewBurnSchedule() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.DrogonBurn as Program<DrogonBurn>;

    const SEED = 'burn_schedule_account'; // Use the same seed you used in the init function

    const [burnScheduleAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(SEED)],
        program.programId
    );

    try {
        const burnScheduleAccount = await program.account.burnScheduleAccount.fetch(burnScheduleAccountPda);

        console.log(`BurnScheduleAccount Pubkey: ${burnScheduleAccountPda.toBase58()}`);
        burnScheduleAccount.events.forEach(event => {
            const formattedTimestamp = formatTimestamp(new BN(event.timestamp));
            console.log(`Event Number: ${event.eventNumber}, Timestamp: ${formattedTimestamp}, Burn Stage: ${event.burnStage}, Cumulative Burned: ${event.cumulativeBurned}, Burned at Event: ${event.burnedAtEvent}`);
        });
    } catch (error) {
        console.error('Error fetching burn schedule account:', error);
    }
}

// Call the function (for example, in your main script)
viewBurnSchedule().catch(console.error);
