import { motion } from "framer-motion";

const features = [
  {
    icon: "📈",
    title: "Yield‑Based Collateral",
    desc: "Your hardware's future earnings back the loan — not just static value. Dynamic valuation based on real performance.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: "🛡️",
    title: "BNB Greenfield Storage",
    desc: "Immutable proof-of-operation logs, verified on‑chain. Tamper-proof records for every device heartbeat.",
    accent: "from-secondary/20 to-secondary/5",
  },
  {
    icon: "⚡",
    title: "opBNB Scalability",
    desc: "Sub‑cent fees for daily yield tracking & reward distribution. Scale to millions of devices without bottlenecks.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: "🔐",
    title: "Non‑Custodial",
    desc: "You keep ownership — only yield rights are tokenized. Reclaim full control after repayment.",
    accent: "from-secondary/20 to-secondary/5",
  },
];

const FeaturesSection = () => (
  <section id="features" className="scroll-mt-28 py-24 px-6 relative">
    <div className="section-divider max-w-6xl mx-auto mb-24" />

    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Why Choose Us</p>
        <h2 className="text-3xl md:text-5xl font-bold mb-5">
          Why <span className="gradient-text">MachineFi Lending</span>?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg">
          The first lending market designed specifically for DePIN operators and yield‑generating hardware.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass-card p-8 md:p-10 group relative overflow-hidden"
          >
            {/* Gradient hover accent */}
            <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
