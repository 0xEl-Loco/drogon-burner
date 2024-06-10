#!/bin/bash

# Configuration
PROGRAM_PATH="/Users/adrienfernandezbaca/Drogon/drogon_burn/target/deploy/drogon_burn.so"
MAX_RETRIES=50
COMPUTE_UNIT_PRICE=200000
DEPLOY_SUCCESS=false
RETRY_COUNT=0
WALLET_PATH="/Users/adrienfernandezbaca/Key/key.json"

# Ensure Solana CLI is configured to use the correct wallet
export ANCHOR_WALLET=$WALLET_PATH

# Function to deploy the program
deploy_program() {
    echo "Attempting to deploy program: $PROGRAM_PATH"
    # Fetch a new blockhash
    BLOCKHASH=$(solana blockhash | grep 'Recent Blockhash:' | awk '{print $3}')
    echo "Using blockhash: $BLOCKHASH"
    # Deploy the program using the new blockhash
    solana program deploy --blockhash $BLOCKHASH --with-compute-unit-price $COMPUTE_UNIT_PRICE --skip-fee-check --keypair $WALLET_PATH $PROGRAM_PATH
}

# Main deployment loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    deploy_program
    DEPLOY_EXIT_CODE=$?

    if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
        DEPLOY_SUCCESS=true
        break
    else
        echo "Deployment failed with exit code $DEPLOY_EXIT_CODE. Retrying immediately... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ "$DEPLOY_SUCCESS" = true ]; then
    echo "Program deployed successfully!"
else
    echo "Failed to deploy program after $MAX_RETRIES attempts."
    exit 1
fi
