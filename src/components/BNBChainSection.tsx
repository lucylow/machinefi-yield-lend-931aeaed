import { motion } from "framer-motion";
import { ArchitectureStrip } from "@/components/protocol/ArchitectureStrip";

const tags = [
  { icon: "⛓️", label: "BNB Chain" },
  { icon: "🔷", label: "opBNB L2" },
  { icon: "📦", label: "Greenfield" },
  { icon: "🔗", label: "Chainlink Oracles" },
];

const metrics = [
  { value: "1,280", label: "active devices", icon: "📡" },
  { value: "99.2%", label: "oracle uptime", icon: "✅" },
  { value: "<$0.01", label: "per tx on opBNB", icon: "⚡" },
];

const BNBChainSection = () => (
  <section id="bnb-chain" className="scroll-mt-28 py-24 px-6 relative">
    <div className="section-divider max-w-6xl mx-auto mb-24" />

    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Why BNB Chain</p>
        <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
          Settlement, scale, and <span className="gradient-text">proof storage</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          BSC finalizes lending state. opBNB carries high-frequency yield telemetry. Greenfield anchors evidence with
          tamper-evident references — a DePIN-native stack for bankable machines.
        </p>
      </motion.div>

      <ArchitectureStrip className="mb-10 max-w-4xl mx-auto" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 md:p-10 lg:col-span-3"
        >
          <h3 className="text-2xl font-bold font-display text-foreground mb-4">Stack in production terms</h3>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Core positions settle on BSC. Yield cadence and device activity roll up on opBNB to keep costs negligible.
            Proof bundles and audit trails land on Greenfield so governance and liquidators can reason about evidence, not
            trust.
          </p>

          <div className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.05] text-primary text-sm font-medium hover:bg-primary/10 transition-colors duration-200"
              >
                {tag.icon} {tag.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Metrics column */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2 flex flex-col gap-5"
        >
          {metrics.map((m) => (
            <div key={m.label} className="glass-card p-6 flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-300">
                {m.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default BNBChainSection;
