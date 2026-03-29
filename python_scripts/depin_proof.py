#!/usr/bin/env python3
"""
depin_proof.py - Proof of Operation Submission for MachineFi Lending Pool
Uploads a signed timestamp to BNB Greenfield to prove device liveness.
"""

import os
import time
import json
import hashlib
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
import boto3
from botocore.config import Config
from web3 import Web3
import requests

# === CONFIGURATION ===
DEVICE_PRIVATE_KEY_PATH = "/path/to/device_private_key.pem"   # EC private key
DEVICE_PUBLIC_KEY_PATH = "/path/to/device_public_key.pem"
GREENFIELD_ENDPOINT = "https://gnfd-testnet-sp-1.nodereal.io"  # Testnet endpoint
GREENFIELD_BUCKET = "machinefi-proofs"
GREENFIELD_ACCESS_KEY = os.environ.get("GF_ACCESS_KEY")
GREENFIELD_SECRET_KEY = os.environ.get("GF_SECRET_KEY")
DEVICE_ID = os.environ.get("DEVICE_ID", "unique-hardware-serial")  # matches on-chain deviceId
SUBMIT_INTERVAL = 3600  # seconds (1 hour)

# BNB Chain contract addresses (for optional direct on-chain submission)
CONTRACT_ADDRESS = "0xYourHardwareNFTContract"
RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545"
PRIVATE_KEY = os.environ.get("DEVICE_WALLET_PRIVATE_KEY")  # only if device has a wallet

HARDWARE_NFT_ABI = [] # Placeholder ABI

def load_private_key():
    with open(DEVICE_PRIVATE_KEY_PATH, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)

def sign_message(message):
    private_key = load_private_key()
    signature = private_key.sign(message, ec.ECDSA(hashes.SHA256()))
    return signature.hex()

def upload_to_greenfield(data):
    """Upload a JSON blob to BNB Greenfield bucket."""
    s3 = boto3.client(
        's3',
        endpoint_url=GREENFIELD_ENDPOINT,
        aws_access_key_id=GREENFIELD_ACCESS_KEY,
        aws_secret_access_key=GREENFIELD_SECRET_KEY,
        config=Config(signature_version='s3v4')
    )
    key = f"proof_{DEVICE_ID}_{int(time.time())}.json"
    s3.put_object(Bucket=GREENFIELD_BUCKET, Key=key, Body=json.dumps(data))
    return f"s3://{GREENFIELD_BUCKET}/{key}"

def get_token_id(device_id):
    return 1 # Placeholder

def submit_proof_onchain(cid):
    """Optionally call the smart contract to record the proof CID."""
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = w3.eth.account.from_key(PRIVATE_KEY)
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=HARDWARE_NFT_ABI)
    token_id = get_token_id(DEVICE_ID)
    tx = contract.functions.submitProof(token_id, cid).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 200000,
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print(f"Proof submitted on-chain: {tx_hash.hex()}")

def main():
    while True:
        timestamp = int(time.time())
        message = f"{DEVICE_ID}:{timestamp}".encode()
        signature = sign_message(message)

        proof_data = {
            "deviceId": DEVICE_ID,
            "timestamp": timestamp,
            "signature": signature,
            "version": "1.0"
        }

        # Upload to Greenfield
        cid = upload_to_greenfield(proof_data)
        print(f"Proof uploaded: {cid}")

        # Optionally call smart contract (if device has BNB balance)
        if PRIVATE_KEY:
            submit_proof_onchain(cid)

        time.sleep(SUBMIT_INTERVAL)

if __name__ == "__main__":
    main()
