const express = require('express');
const { ethers } = require('ethers');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ipfsClient = require('ipfs-http-client');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Configuration
const PROVIDER_URL = 'https://bsc-dataseed.binance.org/';
const PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
const CONTRACT_ADDRESS = '0xYourRWAAssetContract';
const RWA_ABI = [
    // minimal ABI to mintAsset
    "function mintAsset(address owner, uint8 assetType, uint256 value, string calldata metadataURI) external returns (uint256)"
]; 

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, RWA_ABI, wallet);

// IPFS client
const ipfs = ipfsClient.create({ url: 'http://localhost:5001' });

app.use(express.json());

// Endpoint to submit asset for verification
app.post('/verify-asset', upload.single('document'), async (req, res) => {
    try {
        const { ownerAddress, assetType, estimatedValue } = req.body;
        const file = req.file;

        // 1. Perform KYC/AML on owner (simulated)
        const isKycPassed = await performKYC(ownerAddress);
        if (!isKycPassed) {
            return res.status(400).json({ error: 'KYC failed' });
        }

        // 2. Upload document to IPFS
        const fileBuffer = require('fs').readFileSync(file.path);
        const ipfsResult = await ipfs.add(fileBuffer);
        const documentCID = ipfsResult.path;

        // 3. Create metadata JSON
        const metadata = {
            name: `RWA Asset ${uuidv4()}`,
            description: `Asset type: ${assetType}`,
            estimatedValue: estimatedValue,
            documentCID: documentCID,
            verifier: wallet.address,
            timestamp: Date.now()
        };
        const metadataBuffer = Buffer.from(JSON.stringify(metadata));
        const metadataResult = await ipfs.add(metadataBuffer);
        const metadataURI = `ipfs://${metadataResult.path}`;

        // 4. Call smart contract to mint the asset token
        const tx = await contract.mintAsset(
            ownerAddress,
            assetType,
            ethers.utils.parseEther(estimatedValue.toString()),
            metadataURI
        );
        const receipt = await tx.wait();

        // 5. Return the token ID
        const event = receipt.events.find(e => e.event === 'AssetRegistered');
        const tokenId = event ? event.args.tokenId : null;

        res.json({ success: true, tokenId: tokenId ? tokenId.toString() : null, metadataURI });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Simulate KYC (in reality, call a third‑party service)
async function performKYC(address) {
    // Placeholder – always return true for demo
    return true;
}

app.listen(3000, () => console.log('Verification service running on port 3000'));
