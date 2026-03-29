import { motion } from 'framer-motion';
import type { HardwareDevice } from '@/hooks/useHardwareNFT';

interface Props {
  devices: HardwareDevice[];
}

const MyHardware = ({ devices }: Props) => (
  <div>
    <h3 className="text-lg font-semibold text-foreground mb-4">📟 My Hardware NFTs</h3>
    {devices.length === 0 ? (
      <div className="glass-card p-8 text-center" style={{ borderRadius: '1.5rem' }}>
        <p className="text-muted-foreground">No hardware registered yet. Register a device to get started!</p>
      </div>
    ) : (
      <div className="space-y-3">
        {devices.map((device, i) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex items-center justify-between"
            style={{ borderRadius: '1rem' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                {device.type.includes('Helium') ? '📡' : device.type.includes('Hivemapper') ? '📷' : '🚗'}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{device.type}</p>
                <p className="text-xs text-muted-foreground">ID: {device.deviceId.slice(0, 12)}...</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">${device.monthlyYield}/mo</p>
              <p className="text-xs text-muted-foreground">
                {device.isActive ? '🟢 Active' : '🔴 Inactive'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

export default MyHardware;
