import type { MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatBpsAsPercent, formatUsd } from "@/lib/format";
import { WorkflowStrip } from "@/components/protocol/WorkflowStrip";
import { useProtocolSimulationOptional } from "@/contexts/ProtocolSimulationContext";

// Floating particles background
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/30"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.6, 0.2],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 4,
          repeat: Infinity,
          delay: Math.random() * 3,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

const HeroSection = () => {
  const sim = useProtocolSimulationOptional();
  const o = sim?.snapshot?.overview ?? {
    totalCollateralUsd: 0,
    totalBorrowedUsd: 0,
    activeDevices: 0,
    liquidationThresholdBps: 7500,
  };
  const stats = [
    {
      icon: "◈",
      value: formatUsd(o.totalCollateralUsd, { compact: true }),
      label: "Total collateral value",
      hint: "Marked from verified proofs",
    },
    {
      icon: "◇",
      value: formatUsd(o.totalBorrowedUsd, { compact: true }),
      label: "Total borrowed",
      hint: "Stablecoin liquidity outstanding",
    },
    {
      icon: "◎",
      value: `${o.activeDevices.toLocaleString()}`,
      label: "Active devices",
      hint: "Registered & attested",
    },
    {
      icon: "△",
      value: formatBpsAsPercent(o.liquidationThresholdBps, 0),
      label: "Liquidation threshold",
      hint: "Max LTV before liquidation",
    },
  ];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, [0, 1], ["30%", "70%"]);
  const glowY = useTransform(mouseY, [0, 1], ["20%", "80%"]);

  const handleMouse = (e: ReactMouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden"
      onMouseMove={handleMouse}
    >
      {/* Dynamic ambient glow following mouse */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, hsl(160, 100%, 48%), transparent)",
          left: glowX,
          top: glowY,
          x: "-50%",
          y: "-50%",
        }}
      />

      {/* Static ambient glows */}
      <div className="absolute top-1/3 left-[10%] w-80 h-80 rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-[15%] w-72 h-72 rounded-full bg-secondary/[0.04] blur-[100px] pointer-events-none" />

      <Particles />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-8 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/[0.05] text-sm text-primary backdrop-blur-sm"
        >
          <span className="glow-dot" />
          <span className="uppercase text-xs font-semibold tracking-wider">MachineFi lending pool</span>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <span className="text-muted-foreground hidden sm:inline text-xs">BNB Chain</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-display leading-[1.08] mb-6 tracking-tight"
        >
          Bankable machines.{" "}
          <span className="gradient-text">Verified yield as collateral.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Borrow stablecoins against productive hardware and RWA: proofs refresh collateral value, governance sets risk
          parameters, liquidation protects the pool.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
        >
          <Link to="/borrow" className="btn-gradient px-8 py-3.5 rounded-full font-semibold text-primary-foreground flex items-center justify-center gap-2">
            Start Borrowing
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => toast.message("Whitepaper", { description: "Link coming soon — join the app from Launch or Borrow." })}
            className="btn-outline-glow px-8 py-3.5 rounded-full font-semibold text-foreground flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            📄 Read whitepaper
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="glass-card p-5 md:p-6 text-left group"
            >
              <div className="text-lg mb-2 text-primary/90 font-display" aria-hidden>
                {s.icon}
              </div>
              <div className="stat-number text-2xl md:text-3xl tabular-nums">{s.value}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">{s.label}</div>
              {"hint" in s && s.hint ? <div className="text-xs text-muted-foreground/80 mt-1 leading-snug">{s.hint}</div> : null}
            </motion.div>
          ))}
        </motion.div>

        <WorkflowStrip />
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
