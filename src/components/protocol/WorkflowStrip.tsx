import { motion } from "framer-motion";

const STEPS = [
  { step: 1, title: "Register device", detail: "Link hardware or RWA to identity" },
  { step: 2, title: "Tokenize yield", detail: "Verified future yield as collateral" },
  { step: 3, title: "Borrow USDC", detail: "Draw against verified value" },
  { step: 4, title: "Repay & unlock", detail: "Restore full economic rights" },
] as const;

export function WorkflowStrip() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-14 md:mt-16">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary/90 mb-6">Protocol flow</p>
      <ol className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="glass-card p-4 md:p-5 text-left relative overflow-hidden"
            style={{ borderRadius: "1rem" }}
          >
            <span className="absolute top-3 right-3 text-[10px] font-bold text-primary/50 tabular-nums">0{s.step}</span>
            <p className="text-sm font-semibold text-foreground pr-6">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{s.detail}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
