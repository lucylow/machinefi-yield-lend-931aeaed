import { useState } from 'react';
import { useHardwareNFT } from '@/hooks/useHardwareNFT';
import { toast } from 'sonner';
import { ethers } from 'ethers';

// Matches HardwareNFT.DeviceType enum (Solidity: Helium=0, Hivemapper=1, EvCharger=2, Custom=3)
const deviceTypes = [
  { value: 0, label: 'Helium Hotspot' },
  { value: 1, label: 'Hivemapper Dashcam' },
  { value: 2, label: 'EV Charger (DePIN)' },
  { value: 3, label: 'Other DePIN Device' },
];

const RegisterHardware = () => {
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceType, setDeviceType] = useState(0);
  const { registerDevice, loading } = useHardwareNFT();

  const handleRegister = async () => {
    if (!serialNumber.trim()) return toast.error('Enter a serial number');
    const deviceId = ethers.utils.formatBytes32String(serialNumber.slice(0, 31));
    const greenfieldProofCID = 'ipfs://proof-placeholder';
    const publicKey = ethers.utils.toUtf8Bytes('demo-device-pubkey');
    await registerDevice(deviceId, deviceType, greenfieldProofCID, publicKey);
  };

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-foreground mb-5">🆕 Register New Hardware</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Device Type</label>
          <select
            value={deviceType}
            onChange={(e) => setDeviceType(Number(e.target.value))}
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          >
            {deviceTypes.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Serial Number</label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g. HLM-2024-001234"
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="btn-gradient w-full py-3 rounded-full font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? '⏳ Registering...' : '🔗 Mint Hardware NFT'}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Your device will be verified via oracle before full activation.
        </p>
      </div>
    </div>
  );
};

export default RegisterHardware;
