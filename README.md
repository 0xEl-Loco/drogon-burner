
# Drogon Burner

## Program ID
mainnet : `EdP2oU3WJZmihpYLzdKVauzS1KUCXDUowCCwHv4retZx`

CLI cmd to check the program : `solana program show EdP2oU3WJZmihpYLzdKVauzS1KUCXDUowCCwHv4retZx`

## Audit
This code has been audited by Cyberscope the 4th of June 2024

Audit report : 

## Overview

The Drogon Burner Program is a Solana-based smart contract designed to manage and execute automatically the token burn operations of El Loco's drogon tokens. The program allows for the initialization of a `Drogon` account and its associated token account, transferring tokens from El Loco's wallet to the associated token account, and then scheduling a series of burns according to a predefined calendar. The program also ensures that the tokens are securely locked within an Escrow account.

## Objective

The objective of this program is to provide a secure setup for token burning operations, including:

1. Initializing a `DrogonAccount` .
2. Creating an associated token account `DrogonAccount` with the authority set to the `DrogonAccount`.
3. Transferring a specified amount of tokens from El Loco's wallet to the `EscrowAccount`.
4. Creating an account for the burn schedule
4. Implementing a function that manage the burn based on the burn schedule.

## Components

### Main Accounts

- **DrogonAccount**:
  - PDA derived from a seed (`"drogon_account"`).
  - Keeps track of drogon token mint, burn schedule initialization time, total tokens burned, and the associated token accounts and their initialization.

- **Mint**: The `mint` is coming from another contract deployed by pump.fun for which we have no authority (mint-authority and freeze-authority being revoked of course), so we set up `drogon.mint` manually.

- **Escrow Wallet - Associated Token Account**:
  - PDA derived from a seed (`"escrow_wallet_account"`).
  - The account that will hold the drogon tokens to be burned.

- **Burn Schedule Account**:
  - PDA derived from a seed (`"burn_schedule_account"`).
  - The account that will hold all the burn schedule


### Main Functions
- **Initialization** 
  1. **Drogon Account Setup**: To act as the main control account for handling burn operations.
  2. **Escrow Wallet Creation**: To hold the tokens securely before they are burned according to the schedule.
  3. **Token Transfer to Escrow Wallet**: To transfer tokens from El Loco's wallet to the escrow wallet, ensuring they are locked and managed by the program.
  4. **Burn schedule creation**: To establish a clear and immutable schedule that defines the frequency and quantity of token burns. The schedule and first burn starts 1h after initialization of the calendar.

- **Burn Function** 
  - **Overview** : The burn function, \`burn_tokens\`, is a critical component of the Drogon Burner Program. It automatically executes token burns according to a predefined schedule, utilizing the current time provided by the Solana blockchain's context to determine the appropriate action. 
  - **Purpose** :To enable full decentralization and allow any participant or automated system (like a cron job) to trigger the burn process
  - **Operational workflow**: 
    - **Step 1**: Retrieve the current time from the blockchain's context.
    - **Step 2**: Use the current time to locate the relevant burn event in the schedule. This involves comparing the current time against the timestamps defined for each burn event.
    - **Step 3**: Calculate the total tokens expected to be burned by this point in the schedule.
    - **Step 4**: Compare the expected total tokens to be burned with the actual number already burned, which is tracked in the Drogon account.
    - **Step 5**: If the expected burn exceeds the actual burn, execute a burn for the difference, updating the state within the smart contract to reflect the new total of burned tokens.
  - **Accessibility** : Public, ensuring that it can be executed by anyone without requiring special permissions.


### Burn Schedule

The burn schedule is predefined and outlines the percentage of tokens to be burned at each event:

| #  | Series    | Day  | Tokens to Burn | Stage Burn % | Burn % (Init Supply) | Burn % (Remain Supply) | i Duration (d) | Cumulated Burn |
|----|-----------|------|----------------|--------------|----------------------|------------------------|----------------|----------------|
| 1  | SEED BURN | 0.00 | 60,000,000     | 20%          | 6.00%                | 6.00%                  | 0.167          | 6.00%          |
| 2  | SEED BURN | 0.17 | 48,000,000     | 16%          | 4.80%                | 5.11%                  | 0.167          | 10.80%         |
| 3  | SEED BURN | 0.33 | 42,000,000     | 14%          | 4.20%                | 4.71%                  | 0.167          | 15.00%         |
| 4  | SEED BURN | 0.50 | 24,000,000     | 8%           | 2.40%                | 2.82%                  | 0.167          | 17.40%         |
| 5  | SEED BURN | 0.67 | 21,000,000     | 7%           | 2.10%                | 2.54%                  | 0.167          | 19.50%         |
| 6  | SEED BURN | 0.83 | 18,000,000     | 6%           | 1.80%                | 2.24%                  | 0.167          | 21.30%         |
| 7  | SEED BURN | 1.00 | 15,000,000     | 5%           | 1.50%                | 1.91%                  | 0.167          | 22.80%         |
| 8  | SEED BURN | 1.17 | 12,000,000     | 4%           | 1.20%                | 1.55%                  | 0.167          | 24.00%         |
| 9  | SEED BURN | 1.33 | 6,000,000      | 2%           | 0.60%                | 0.79%                  | 0.167          | 24.60%         |
| 10 | SEED BURN | 1.50 | 6,000,000      | 2%           | 0.60%                | 0.80%                  | 0.167          | 25.20%         |
| 11 | SEED BURN | 1.67 | 6,000,000      | 2%           | 0.60%                | 0.80%                  | 0.167          | 25.80%         |
| 12 | SEED BURN | 1.83 | 6,000,000      | 2%           | 0.60%                | 0.81%                  | 0.167          | 26.40%         |
| 13 | SEED BURN | 2.00 | 6,000,000      | 2%           | 0.60%                | 0.82%                  | 0.167          | 27.00%         |
| 14 | SEED BURN | 2.17 | 6,000,000      | 2%           | 0.60%                | 0.82%                  | 0.167          | 27.60%         |
| 15 | SEED BURN | 2.33 | 6,000,000      | 2%           | 0.60%                | 0.83%                  | 0.167          | 28.20%         |
| 16 | SEED BURN | 2.50 | 6,000,000      | 2%           | 0.60%                | 0.84%                  | 0.167          | 28.80%         |
| 17 | SEED BURN | 2.67 | 6,000,000      | 2%           | 0.60%                | 0.84%                  | 0.167          | 29.40%         |
| 18 | SEED BURN | 2.83 | 6,000,000      | 2%           | 0.60%                | 0.85%                  | 0.167          | 30.00%         |
| 19 | BURN A    | 3    | 30,000,000     | 20%          | 3.00%                | 4.29%                  | 1              | 33.00%         |
| 20 | BURN A    | 4    | 24,000,000     | 16%          | 2.40%                | 3.58%                  | 1              | 35.40%         |
| 21 | BURN A    | 5    | 21,000,000     | 14%          | 2.10%                | 3.25%                  | 1              | 37.50%         |
| 22 | BURN A    | 6    | 12,000,000     | 8%           | 1.20%                | 1.92%                  | 1              | 38.70%         |
| 23 | BURN A    | 7    | 10,500,000     | 7%           | 1.05%                | 1.71%                  | 1              | 39.75%         |
| 24 | BURN A    | 8    | 9,000,000      | 6%           | 0.90%                | 1.49%                  | 1              | 40.65%         |
| 25 | BURN A    | 9    | 7,500,000      | 5%           | 0.75%                | 1.26%                  | 1              | 41.40%         |
| 26 | BURN A    | 10   | 6,000,000      | 4%           | 0.60%                | 1.02%                  | 1              | 42.00%         |
| 27 | BURN A    | 11   | 3,000,000      | 2%           | 0.30%                | 0.52%                  | 1              | 42.30%         |
| 28 | BURN A    | 12   | 3,000,000      | 2%           | 0.30%                | 0.52%                  | 1              | 42.60%         |
| 29 | BURN A    | 13   | 3,000,000      | 2%           | 0.30%                | 0.52%                  | 1              | 42.90%         |
| 30 | BURN A    | 14   | 3,000,000      | 2%           | 0.30%                | 0.53%                  | 1              | 43.20%         |
| 31 | BURN A    | 15   | 3,000,000      | 2%           | 0.30%                | 0.53%                  | 1              | 43.50%         |
| 32 | BURN A    | 16   | 3,000,000      | 2%           | 0.30%                | 0.53%                  | 1              | 43.80%         |
| 33 | BURN A    | 17   | 3,000,000      | 2%           | 0.30%                | 0.53%                  | 1              | 44.10%         |
| 34 | BURN A    | 18   | 3,000,000      | 2%           | 0.30%                | 0.54%                  | 1              | 44.40%         |
| 35 | BURN A    | 19   | 3,000,000      | 2%           | 0.30%                | 0.54%                  | 1              | 44.70%         |
| 36 | BURN A    | 20   | 3,000,000      | 2%           | 0.30%                | 0.54%                  | 1              | 45.00%         |
| 37 | BURN B    | 21   | 15,000,000     | 20%          | 1.50%                | 2.73%                  | 6              | 46.50%         |
| 38 | BURN B    | 27   | 12,000,000     | 16%          | 1.20%                | 2.24%                  | 6              | 47.70%         |
| 39 | BURN B    | 33   | 10,500,000     | 14%          | 1.05%                | 2.01%                  | 6              | 48.75%         |
| 40 | BURN B    | 39   | 6,000,000      | 8%           | 0.60%                | 1.17%                  | 6              | 49.35%         |
| 41 | BURN B    | 45   | 5,250,000      | 7%           | 0.53%                | 1.04%                  | 6              | 49.88%         |
| 42 | BURN B    | 51   | 4,500,000      | 6%           | 0.45%                | 0.90%                  | 6              | 50.33%         |
| 43 | BURN B    | 57   | 3,750,000      | 5%           | 0.38%                | 0.75%                  | 6              | 50.70%         |
| 44 | BURN B    | 63   | 3,000,000      | 4%           | 0.30%                | 0.61%                  | 6              | 51.00%         |
| 45 | BURN B    | 69   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.15%         |
| 46 | BURN B    | 75   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.30%         |
| 47 | BURN B    | 81   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.45%         |
| 48 | BURN B    | 87   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.60%         |
| 49 | BURN B    | 93   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.75%         |
| 50 | BURN B    | 99   | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 51.90%         |
| 51 | BURN B    | 105  | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 52.05%         |
| 52 | BURN B    | 111  | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 52.20%         |
| 53 | BURN B    | 117  | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 52.35%         |
| 54 | BURN B    | 123  | 1,500,000      | 2%           | 0.15%                | 0.31%                  | 6              | 52.50%         |
| 55 | BURN C    | 129  | 6,500,000      | 20%          | 0.65%                | 1.37%                  | 36             | 53.15%         |
| 56 | BURN C    | 165  | 4,875,000      | 15%          | 0.49%                | 1.04%                  | 36             | 53.64%         |
| 57 | BURN C    | 201  | 4,875,000      | 15%          | 0.49%                | 1.05%                  | 36             | 54.13%         |
| 58 | BURN C    | 237  | 2,600,000      | 8%           | 0.26%                | 0.57%                  | 36             | 54.39%         |
| 59 | BURN C    | 273  | 2,275,000      | 7%           | 0.23%                | 0.50%                  | 36             | 54.61%         |
| 60 | BURN C    | 309  | 1,950,000      | 6%           | 0.20%                | 0.43%                  | 36             | 54.81%         |
| 61 | BURN C    | 345  | 1,625,000      | 5%           | 0.16%                | 0.36%                  | 36             | 54.97%         |
| 62 | BURN C    | 381  | 1,300,000      | 4%           | 0.13%                | 0.29%                  | 36             | 55.10%         |
| 63 | BURN C    | 417  | 650,000        | 2%           | 0.07%                | 0.14%                  | 36             | 55.17%         |
| 64 | BURN C    | 453  | 650,000        | 2%           | 0.07%                | 0.14%                  | 36             | 55.23%         |
| 65 | BURN C    | 489  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.30%         |
| 66 | BURN C    | 525  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.36%         |
| 67 | BURN C    | 561  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.43%         |
| 68 | BURN C    | 597  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.49%         |
| 69 | BURN C    | 633  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.56%         |
| 70 | BURN C    | 669  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.62%         |
| 71 | BURN C    | 705  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.69%         |
| 72 | BURN C    | 741  | 650,000        | 2%           | 0.07%                | 0.15%                  | 36             | 55.75%         |
| 73 | BURN FINAL| 777  | 16,250,000     | 100%         | 1.63%                | 3.67%                  | 36             | 57.38%         |


### Deployment

1. This smartcontract is deployed on the the Solana mainnet.
2. Burn need to be executed manually. A Cron job will be set up but anybody can call the burn function.


## Security
The Drogon Burner Program is designed with a strong focus on security to ensure that the SPL tokens designated for burning cannot be withdrawn or misappropriated. The following security measures are implemented to achieve this:

**Escrow Wallet Authority:** The Escrow Wallet, where the tokens are held before burning, is controlled by a Program Derived Address (PDA). PDAs are special types of addresses that do not have a private key and can only be controlled by the program itself. This ensures that no external entity can sign transactions to transfer tokens out of the escrow wallet manually.
Controlled Access: Only the Drogon Burner Program has the authority to sign and execute transactions for the PDA. This ensures that all token burns are executed programmatically according to the predefined schedule, without any possibility of unauthorized withdrawals.

**No Manual Withdrawal Functionality:** The program does not include any instructions or functions that would allow for the manual withdrawal of tokens from the Escrow Wallet. This design choice ensures that once tokens are transferred to the escrow, they are locked in place and can only be burned according to the burn schedule.

**Immutable Logic:** Once the program is deployed and the update authority is revoked, the logic of the program becomes immutable. This means no further changes can be made to the contract, ensuring the security mechanisms remain intact and unalterable.

**Ensuring Token Integrity:**
The combination of PDAs, the absence of withdrawal functionalities, and the immutable program logic ensures that the SPL tokens committed to the Drogon Burner Program are secure. The design guarantees that tokens can only be burned according to the predefined schedule, maintaining the integrity and trustworthiness of the token burn process.

## Conclusion
This high-level specification outlines a fixed and immutable burn schedule for managing token burns using a public function, ensuring precise execution according to the predefined intervals and distribution pattern. This approach maintains the security and integrity of the burn process by allowing anyone to trigger the burns while adhering to the defined schedule.

## Author
Built by El Loco.