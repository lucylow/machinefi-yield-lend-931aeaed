import { motion } from "framer-motion";

const steps = [
  {
    num: 1,
    title: "Register device",
    desc: "Bind hardware or RWA to identity. Unverified devices are ignored for collateral until attested.",
    icon: "⬡",
  },
  {
    num: 2,
    title: "Tokenize yield",
    desc: "Verified future yield becomes a transferable accounting claim — the bridge into borrow limits and haircuts.",
    icon: "◇",
  },
  {
    num: 3,
    title: "Borrow USDC",
    desc: "Draw stablecoins against refreshed collateral marks. LTV, rates, and caps are governance-bound.",
    icon: "◈",
  },
  {
    num: 4,
    title: "Repay & unlock",
    desc: "Repay principal and accrued interest. Full repayment releases the position and restores economic rights.",
    icon: "○",
  },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="scroll-mt-28 py-24 px-6 relative">
    <div className="section-divider max-w-4xl mx-auto mb-24" />

    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">How it works</p>
        <h2 className="text-3xl md:text-5xl font-bold font-display">
          From <span className="gradient-text">proof</span> to borrow limit
        </h2>
      </motion.div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="glass-card p-6 md:p-8 flex gap-5 md:gap-6 items-start group relative"
          >
            {/* Step connector line */}
            {i < steps.length - 1 && <div className="step-connector hidden md:block" />}

            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 flex items-center justify-center relative">
              <span className="text-lg">{s.icon}</span>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {s.num}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-300">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
