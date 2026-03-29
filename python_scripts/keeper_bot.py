import time
import os
from web3 import Web3
from eth_account import Account

# Configuration
RPC_URL = "https://bsc-dataseed.binance.org/"
LENDING_POOL_ADDRESS = "0x..."
LENDING_POOL_ABI = [...]  # includes liquidate, getPosition
LIQUIDATION_THRESHOLD = 7500  # 75% LTV
KEEPER_PRIVATE_KEY = os.environ.get("KEEPER_PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
if KEEPER_PRIVATE_KEY:
    keeper_account = Account.from_key(KEEPER_PRIVATE_KEY)

def monitor_and_liquidate():
    lending_pool = w3.eth.contract(address=LENDING_POOL_ADDRESS, abi=LENDING_POOL_ABI)
    positions = get_active_positions()
    for nft_id in positions:
        pos = lending_pool.functions.getPosition(nft_id).call()
        ltv = pos[2]
        if ltv >= LIQUIDATION_THRESHOLD:
            print(f"Liquidating position {nft_id}, LTV={ltv}")
            tx = lending_pool.functions.liquidate(nft_id).build_transaction({
                'from': keeper_account.address,
                'nonce': w3.eth.get_transaction_count(keeper_account.address),
                'gas': 500000,
                'gasPrice': w3.eth.gas_price
            })
            signed = keeper_account.sign_transaction(tx)
            w3.eth.send_raw_transaction(signed.rawTransaction)

def get_active_positions():
    # In production, query a subgraph or iterate through events.
    # For demo, return a hardcoded list.
    return [1, 2, 3]

if __name__ == "__main__":
    while True:
        monitor_and_liquidate()
        time.sleep(60)
