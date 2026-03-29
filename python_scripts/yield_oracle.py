import os
import json
import time
import boto3
from web3 import Web3
import requests
from eth_account import Account
from eth_account.messages import encode_defunct

# Configuration
RPC_URL = "https://bsc-dataseed.binance.org/"
LENDING_POOL_ADDRESS = "0x..." # Fill actual pool address
LENDING_POOL_ABI = [...]  # ABI with updateCollateralValue
HARDWARE_NFT_ADDRESS = "0x..." # Fill actual NFT address
HARDWARE_NFT_ABI = [...]  # ABI with getDevice, verifyProof
ORACLE_PRIVATE_KEY = os.environ.get("ORACLE_PRIVATE_KEY")
GREENFIELD_ENDPOINT = "https://gnfd-testnet-sp-1.nodereal.io"
GREENFIELD_BUCKET = "machinefi-proofs"
GREENFIELD_ACCESS_KEY = os.environ.get("GF_ACCESS_KEY")
GREENFIELD_SECRET_KEY = os.environ.get("GF_SECRET_KEY")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
if ORACLE_PRIVATE_KEY:
    oracle_account = Account.from_key(ORACLE_PRIVATE_KEY)

def get_hardware_yield(device_type, device_id):
    """Fetch yield from DePIN API. Example for Helium."""
    if device_type == "Helium":
        # Query Helium API for hotspot rewards (last 30 days)
        resp = requests.get(f"https://api.helium.io/v1/hotspots/{device_id}/rewards/sum?min_time=-30d")
        data = resp.json()
        total_rewards = float(data.get('data', {}).get('total', 0))
        # Convert to USD using price oracle
        hnt_price = get_price("HNT")
        return total_rewards * hnt_price / 30  # average monthly
    elif device_type == "Hivemapper":
        # Hivemapper API (simulated)
        return 80  # mock
    else:
        return 0

def get_price(token):
    """Fetch price from Chainlink or coingecko."""
    resp = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=helium&vs_currencies=usd")
    return resp.json().get('helium', {}).get('usd', 0)

def verify_proof(device_id, cid):
    """Download proof from Greenfield and verify signature."""
    s3 = boto3.client('s3', endpoint_url=GREENFIELD_ENDPOINT,
                      aws_access_key_id=GREENFIELD_ACCESS_KEY,
                      aws_secret_access_key=GREENFIELD_SECRET_KEY)
    obj = s3.get_object(Bucket=GREENFIELD_BUCKET, Key=cid.replace(f"s3://{GREENFIELD_BUCKET}/", ""))
    proof = json.loads(obj['Body'].read())
    # Recreate message
    message = f"{proof['deviceId']}:{proof['timestamp']}".encode()
    # Recover signer
    message_hash = Web3.solidity_keccak(['string'], [message.decode()])
    signer = Account.recover_message(encode_defunct(primitive=message_hash), signature=proof['signature'])
    
    hw_nft = w3.eth.contract(address=HARDWARE_NFT_ADDRESS, abi=HARDWARE_NFT_ABI)
    device = hw_nft.functions.getDeviceByDeviceId(device_id).call()
    return signer == device[0]  # owner address

def update_all_positions():
    """Iterate over active positions and update collateral values."""
    positions = get_active_positions()
    lending_pool = w3.eth.contract(address=LENDING_POOL_ADDRESS, abi=LENDING_POOL_ABI)
    hw_nft = w3.eth.contract(address=HARDWARE_NFT_ADDRESS, abi=HARDWARE_NFT_ABI)
    
    for nft_id in positions:
        device = hw_nft.functions.devices(nft_id).call()
        device_type = device[2]
        device_id = device[1].hex()
        # Verify proof-of-operation (if recent)
        cid = device[5]  # greenfieldProofCID
        if cid:
            is_valid = verify_proof(device_id, cid)
            if not is_valid:
                continue
        # Compute new collateral
        monthly_yield = get_hardware_yield(device_type, device_id)
        collateral_value = monthly_yield * 12  # 12 months
        # Update on-chain
        tx = lending_pool.functions.updateCollateralValue(nft_id, int(collateral_value * 1e18)).build_transaction({
            'from': oracle_account.address,
            'nonce': w3.eth.get_transaction_count(oracle_account.address),
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        signed = oracle_account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        print(f"Updated position {nft_id}, tx: {tx_hash.hex()}")

def get_active_positions():
    return [1, 2, 3]

if __name__ == "__main__":
    while True:
        update_all_positions()
        time.sleep(3600)
