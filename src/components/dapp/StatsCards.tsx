import { motion } from "framer-motion";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { formatBpsAsPercent, formatUsd } from "@/lib/format";

const StatsCards = () => {
  const { snapshot } = useProtocolSimulation();
  const o = snapshot.overview;
  const stats = [
    {
      label: "Pool collateral",
      value: formatUsd(o.totalCollateralUsd, { compact: true }),
      hint: "Verified marks",
      icon: "◈",
    },
    {
      label: "Outstanding borrows",
      value: formatUsd(o.totalBorrowedUsd, { compact: true }),
      hint: "USDC / USDT",
      icon: "◇",
    },
    {
      label: "Utilization",
      value: formatBpsAsPercent(o.poolUtilizationBps, 1),
      hint: "Liquidity deployed",
      icon: "◎",
    },
    {
      label: "Liquidation LTV",
      value: formatBpsAsPercent(o.liquidationThresholdBps, 0),
      hint: "Protocol max before action",
      icon: "△",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-5 text-center"
          style={{ borderRadius: "1.5rem" }}
        >
          <div className="text-lg mb-2 text-primary/90 font-display" aria-hidden>
            {stat.icon}
          </div>
          <p className="stat-number text-xl md:text-2xl tabular-nums">{stat.value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">{stat.label}</p>
          {"hint" in stat && stat.hint ? <p className="text-xs text-muted-foreground/80 mt-1">{stat.hint}</p> : null}
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
