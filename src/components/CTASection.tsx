import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTASection = () => (
  <section className="py-24 px-6 text-center relative overflow-hidden">
    {/* Background glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[150px] pointer-events-none" />

    <div className="section-divider max-w-3xl mx-auto mb-24" />

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto relative z-10"
    >
      <h2 className="text-3xl md:text-5xl font-bold mb-6">
        Ready to <span className="gradient-text">unlock</span> hardware liquidity?
      </h2>
      <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
        Join the MachineFi revolution on BNB Chain. Early depositors get boosted yields & governance tokens.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/dashboard" className="btn-gradient px-8 py-4 rounded-full font-semibold text-primary-foreground flex items-center justify-center gap-2 text-base">
          Launch dApp
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
        <button className="btn-outline-glow px-8 py-4 rounded-full font-semibold text-foreground flex items-center justify-center gap-2 text-base">
          💬 Join Community
        </button>
      </div>
    </motion.div>
  </section>
);

export default CTASection;
