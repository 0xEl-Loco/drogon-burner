const anchor = require('@project-serum/anchor');
const { Connection, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Load the keypair
const keypairPath = path.resolve('/Users/adrienfernandezbaca/Key/key.json');
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
const walletKeypair = Keypair.fromSecretKey(secretKey);

// Set up the connection
const connection = new Connection('https://neat-holy-frost.solana-mainnet.quiknode.pro/65a548a250489db933f10ca99adee34e575f8716/.mainnet-beta.solana.com', 'confirmed');

// Function to fetch the next blockhash
async function fetchNextBlockhash() {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

async function deployProgram() {
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(walletKeypair), {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
  });

  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.MyProgram;

  const transaction = new Transaction();

  // Add your program deployment instructions here
  // Example: transaction.add(program.instruction.myInstruction(...));

  transaction.feePayer = walletKeypair.publicKey;

  const latestBlockhash = await fetchNextBlockhash();
  transaction.recentBlockhash = latestBlockhash;

  // Set compute unit price and max retries
  const computeUnitPrice = 200;
  const maxRetries = 15;

  transaction.instructions.forEach(instruction => {
    instruction.data = Buffer.concat([instruction.data, Buffer.from(Uint8Array.from([computeUnitPrice]))]);
  });

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [walletKeypair], {
      maxRetries,
    });

    console.log('Program deployed with signature:', signature);
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deployProgram();
