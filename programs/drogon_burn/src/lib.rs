use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use std::str::FromStr;

declare_id!("6bvK7zruhc9YtUSPCtsKLH7XaxUWM2SFfbdXK7yKaVQ8");
const AUTHORIZED_KEY: &str = "8ZRWFZscsk4S2ZRaaxif8v2zceTiQhVKsTbK8acEXWMu"; // El loco dev wallet. Update Authority will be set to null after initialization.
const SECONDS_IN_A_DAY: f64 = 86400.0;
const BURN_EVENT_OFFSET: i64 = 3600; // Burn calendar will start 1h after initiation
const INITIAL_TRANSFER_AMOUNT: u64 = 573750000;

#[program]
mod drogon_burn {
    use super::*;

    pub fn initialize_drogon_account(ctx: Context<InitializeDrogonAccount>) -> Result<()> {
        // Authorization Check
        let authorized_key = Pubkey::from_str(AUTHORIZED_KEY).map_err(|_| ErrorCode::Unauthorized)?;
        require!(ctx.accounts.sender.key() == authorized_key, ErrorCode::Unauthorized);

        // Check if drogon account is already initialized
        require!(
            !ctx.accounts.drogon_account.drogon_initialized,
            ErrorCode::AlreadyInitialized
        );
        
        // Initialize Drogon account
        let drogon_account = &mut ctx.accounts.drogon_account;
        drogon_account.initializer = ctx.accounts.sender.to_account_info().key();
        drogon_account.total_burned = 0;
        drogon_account.wallet_to_withdraw_from = ctx.accounts.wallet_to_withdraw_from.to_account_info().key();
        drogon_account.token_mint = ctx.accounts.token_mint.to_account_info().key();
        drogon_account.escrow_wallet_account = ctx.accounts.escrow_wallet_account.to_account_info().key();
        
        // Mark as initialized
        ctx.accounts.drogon_account.drogon_initialized = true;
        Ok(())
    }

    pub fn initialize_transfer_to_escrow(ctx: Context<InitializeTransferToEscrow>) -> Result<()> {
        // Authorization Check
        let authorized_key = Pubkey::from_str(AUTHORIZED_KEY).map_err(|_| ErrorCode::Unauthorized)?;
        require!(ctx.accounts.sender.key() == authorized_key, ErrorCode::Unauthorized);

        // Check if tokens have already been transferred to escrow
        require!(
            !ctx.accounts.drogon_account.tokens_transfered_to_escrow,
            ErrorCode::TokensAlreadyTransferred
        );

         // Calculate the amount to transfer
        let token_decimal = ctx.accounts.token_mint.decimals;
        let amount = INITIAL_TRANSFER_AMOUNT * 10_u64.pow(token_decimal as u32);

         // Check if the withdraw wallet have enough tokens to execute the transfer
        require!(
            &ctx.accounts.wallet_to_withdraw_from.amount >= &amount, 
            ErrorCode::InsufficientBalance
        );
        
        let transfer_instruction = Transfer {
            from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
            to: ctx.accounts.escrow_wallet_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        
        let transfer_result = anchor_spl::token::transfer(cpi_ctx, amount);
        if transfer_result.is_err() {
            return Err(ErrorCode::TransferFailed.into());
        }
    
        // Mark as tokens transferred
        ctx.accounts.drogon_account.tokens_transfered_to_escrow = true;
    
        Ok(())
    }

    pub fn initialize_burn_schedule(ctx: Context<InitializeBurnSchedule>) -> Result<()> {
        // Authorization Check
        let authorized_key = Pubkey::from_str(AUTHORIZED_KEY).map_err(|_| ErrorCode::Unauthorized)?;
        require!(ctx.accounts.sender.key() == authorized_key, ErrorCode::Unauthorized);

        // Check if burn schedule is already initialized
        require!(
            !ctx.accounts.drogon_account.burn_schedule_initialized,
            ErrorCode::BurnScheduleAlreadyInitialized
        );
        
        // create the burn schedule calendar
        let burn_events = create_burn_events();
        let drogon_account = &mut ctx.accounts.drogon_account;
        let initiation_time = ctx.accounts.clock.unix_timestamp;
        drogon_account.initiation_time = initiation_time;
        drogon_account.burn_schedule_account = ctx.accounts.burn_schedule_account.to_account_info().key();
        let initial_events = map_burn_events(burn_events, initiation_time)?;
        let burn_schedule_account = &mut ctx.accounts.burn_schedule_account;
        burn_schedule_account.initialize(initial_events);
        
        // Mark burn schedule as initialized
        ctx.accounts.drogon_account.burn_schedule_initialized = true;
        Ok(())
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>) -> Result<()> {
        require!(
            ctx.accounts.drogon_account.drogon_initialized &&
            ctx.accounts.drogon_account.burn_schedule_initialized &&
            ctx.accounts.drogon_account.tokens_transfered_to_escrow,
            ErrorCode::IncompleteInitializationForBurn
        );

        // Get the current timestamp from the context
        let now_timestamp = ctx.accounts.clock.unix_timestamp;

        let drogon_account = &mut ctx.accounts.drogon_account;
        let burn_schedule_account = &ctx.accounts.burn_schedule_account;
        let relevant_event = binary_search(&burn_schedule_account.events, now_timestamp)?;

        let cumulative_burn = relevant_event.cumulative_burned;
        if cumulative_burn > drogon_account.total_burned {
            let amount_to_burn = cumulative_burn - drogon_account.total_burned;
            let burn_instruction = Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.escrow_wallet_account.to_account_info(),
                authority: drogon_account.to_account_info(),
            };
            let bump = ctx.bumps.drogon_account;
            let seeds = &[b"drogon_account".as_ref(), &[bump]];
            let signer_seeds = &[&seeds[..]];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                burn_instruction,
                signer_seeds,
            );

            let token_decimal = ctx.accounts.token_mint.decimals;
            let amount = amount_to_burn * 10_u64.pow(token_decimal as u32);
            token::burn(cpi_ctx, amount)?;

            drogon_account.total_burned += amount_to_burn;
        }
        Ok(())
    }
}

fn create_burn_events() -> Vec<(u64, f64, u64, u64, u8)> {
    vec![
        (1, 0.00, 60_000_000, 60_000_000, 1),
        (2, 0.17, 48_000_000, 108_000_000, 1),
        (3, 0.33, 42_000_000, 150_000_000, 1),
        (4, 0.50, 24_000_000, 174_000_000, 1),
        (5, 0.67, 21_000_000, 195_000_000, 1),
        (6, 0.83, 18_000_000, 213_000_000, 1),
        (7, 1.00, 15_000_000, 228_000_000, 1),
        (8, 1.17, 12_000_000, 240_000_000, 1),
        (9, 1.33, 6_000_000, 246_000_000, 1),
        (10, 1.50, 6_000_000, 252_000_000, 1),
        (11, 1.67, 6_000_000, 258_000_000, 1),
        (12, 1.83, 6_000_000, 264_000_000, 1),
        (13, 2.00, 6_000_000, 270_000_000, 1),
        (14, 2.17, 6_000_000, 276_000_000, 1),
        (15, 2.33, 6_000_000, 282_000_000, 1),
        (16, 2.50, 6_000_000, 288_000_000, 1),
        (17, 2.67, 6_000_000, 294_000_000, 1),
        (18, 2.83, 6_000_000, 300_000_000, 1),
        (19, 3.00, 30_000_000, 330_000_000, 2),
        (20, 4.00, 24_000_000, 354_000_000, 2),
        (21, 5.00, 21_000_000, 375_000_000, 2),
        (22, 6.00, 12_000_000, 387_000_000, 2),
        (23, 7.00, 10_500_000, 397_500_000, 2),
        (24, 8.00, 9_000_000, 406_500_000, 2),
        (25, 9.00, 7_500_000, 414_000_000, 2),
        (26, 10.00, 6_000_000, 420_000_000, 2),
    ]
}

fn map_burn_events(
    burn_events: Vec<(u64, f64, u64, u64, u8)>,
    initiation_time: i64,
) -> Result<Vec<BurnEventData>> {
    let initial_events: Vec<BurnEventData> = burn_events
        .into_iter()
        .map(
            |(event_number, day, tokens_to_burn, cumulated_burn, burn_stage)| BurnEventData {
                event_number,
                timestamp: initiation_time + (day * SECONDS_IN_A_DAY) as i64 + BURN_EVENT_OFFSET, // burn calendar will start 1h after initiation
                burn_stage,
                cumulative_burned: cumulated_burn,
                burned_at_event: tokens_to_burn,
            },
        ).collect();
    Ok(initial_events)
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct BurnEventData {
    pub event_number: u64,
    pub timestamp: i64,
    pub burn_stage: u8,
    pub cumulative_burned: u64,
    pub burned_at_event: u64,
}

#[account]
pub struct BurnScheduleAccount {
    pub events: Vec<BurnEventData>,
}

impl BurnScheduleAccount {
    pub fn initialize(&mut self, events: Vec<BurnEventData>) {
        self.events = events;
        self.events.sort_by_key(|e| e.timestamp);
    }
}

fn binary_search(events: &[BurnEventData], timestamp: i64) -> Result<&BurnEventData> {
    let mut low = 0;
    let mut high = events.len();

    while low < high {
        let mid = (low + high) / 2;
        if events[mid].timestamp <= timestamp {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    if low > 0 {
        Ok(&events[low - 1])
    } else {
        Err(ErrorCode::NoRelevantEvent.into())
    }
}

#[derive(Accounts)]
pub struct InitializeDrogonAccount<'info> {
    #[account(init_if_needed, payer = sender, seeds = [b"drogon_account"], bump, space = 8 + 8 + 32 + 32 + 32 + 32 + 32 + 8 + 1 + 1 + 1)]
    pub drogon_account: Account<'info, DrogonAccount>,
    #[account(init_if_needed, payer = sender, seeds = [b"escrow_wallet_account"], bump, token::mint = token_mint, token::authority = drogon_account)]
    pub escrow_wallet_account: Account<'info, TokenAccount>,
    #[account(mut, constraint=wallet_to_withdraw_from.owner == sender.key(), constraint=wallet_to_withdraw_from.mint == token_mint.key())]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub token_mint: Account<'info, Mint>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeTransferToEscrow<'info> {
    #[account(mut, seeds = [b"drogon_account"], bump)]
    pub drogon_account: Account<'info, DrogonAccount>,
    #[account(mut, constraint = wallet_to_withdraw_from.owner == sender.key(), constraint = wallet_to_withdraw_from.mint == token_mint.key())]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"escrow_wallet_account"], bump, token::mint = token_mint, token::authority = drogon_account)]
    pub escrow_wallet_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeBurnSchedule<'info> {
    #[account(mut, seeds = [b"drogon_account"], bump)]
    pub drogon_account: Account<'info, DrogonAccount>,
    #[account(init, payer = sender, seeds = [b"burn_schedule_account"], bump, space = 4 + (73 * 40))]
    pub burn_schedule_account: Account<'info, BurnScheduleAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut, seeds = [b"drogon_account"], bump)]
    pub drogon_account: Account<'info, DrogonAccount>,
    pub burn_schedule_account: Account<'info, BurnScheduleAccount>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub token_program: Program<'info, Token>,
    #[account(mut, seeds = [b"escrow_wallet_account"], bump, token::mint = token_mint, token::authority = drogon_account)]
    pub escrow_wallet_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct ViewNextBurnEvent<'info> {
    pub burn_schedule_account: Account<'info, BurnScheduleAccount>,
    pub clock: Sysvar<'info, Clock>,
}

#[account]
pub struct DrogonAccount {
    pub total_burned: u64,
    pub initializer: Pubkey,
    pub escrow_wallet_account: Pubkey,
    pub wallet_to_withdraw_from: Pubkey,
    pub token_mint: Pubkey,
    pub burn_schedule_account: Pubkey,
    pub initiation_time: i64,
    pub drogon_initialized: bool,
    pub tokens_transfered_to_escrow: bool,
    pub burn_schedule_initialized: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access attempt.")]
    Unauthorized,
    #[msg("Drogon account is already initialized.")]
    AlreadyInitialized,
    #[msg("Tokens have already been transferred to the escrow account.")]
    TokensAlreadyTransferred,
    #[msg("Insufficent Balance for transfer.")]
    InsufficientBalance,
    #[msg("Burn schedule is already initialized.")]
    BurnScheduleAlreadyInitialized,
    #[msg("Can't perform burn. Initialization is not completed.")]
    IncompleteInitializationForBurn,
    #[msg("The init transfer failed.")]
    TransferFailed,
    #[msg("The burn has not started. No relevant event found.")]
    NoRelevantEvent,
}
