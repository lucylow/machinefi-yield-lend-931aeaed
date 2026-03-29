import { useState, useMemo } from "react";
import { motion } from "framer-motion";

const presets: Record<string, { yield: number; label: string }> = {
  helium: { yield: 45, label: "Helium Hotspot" },
  hivemapper: { yield: 80, label: "Hivemapper Dashcam" },
  tesla: { yield: 120, label: "Tesla Vehicle" },
  custom: { yield: 0, label: "Custom Device" },
};

const LoanCalculator = () => {
  const [device, setDevice] = useState("helium");
  const [monthlyYield, setMonthlyYield] = useState(45);
  const [ltv, setLtv] = useState(65);
  const [duration, setDuration] = useState(12);

  const handleDeviceChange = (val: string) => {
    setDevice(val);
    if (val !== "custom") setMonthlyYield(presets[val].yield);
  };

  const calc = useMemo(() => {
    const collateral = monthlyYield * 12;
    const loanAmount = collateral * (ltv / 100);
    const interest = loanAmount * 0.08 * (duration / 12);
    const monthly = duration > 0 ? (loanAmount + interest) / duration : 0;
    return {
      collateral: collateral.toFixed(0),
      loanAmount: loanAmount.toFixed(0),
      interest: interest.toFixed(0),
      monthly: monthly.toFixed(2),
    };
  }, [monthlyYield, ltv, duration]);

  // Calculate LTV risk color
  const ltvColor = ltv <= 50 ? "text-primary" : ltv <= 70 ? "text-yellow-400" : "text-destructive";

  return (
    <section id="calculator" className="scroll-mt-28 py-24 px-6 relative">
      <div className="section-divider max-w-5xl mx-auto mb-24" />

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Calculator</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-5">
            <span className="gradient-text">Estimate</span> Your Loan
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">Simulate how much you can borrow against your DePIN hardware.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-6 sm:p-8 md:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Inputs */}
            <div className="space-y-7">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2.5">Hardware Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(presets).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => handleDeviceChange(key)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        device === key
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2.5">Monthly Yield (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <input
                    type="number"
                    value={monthlyYield}
                    onChange={(e) => setMonthlyYield(Number(e.target.value))}
                    className="input-web3 w-full rounded-xl pl-8 pr-4 py-3.5 text-foreground text-lg font-semibold"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-sm font-semibold text-foreground">Loan-to-Value (LTV)</label>
                  <span className={`text-sm font-bold ${ltvColor}`}>{ltv}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={ltv}
                  onChange={(e) => setLtv(Number(e.target.value))}
                  className="w-full accent-primary h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(160, 100%, 48%) 0%, hsl(160, 100%, 48%) ${((ltv - 20) / 60) * 100}%, hsl(195, 40%, 18%) ${((ltv - 20) / 60) * 100}%, hsl(195, 40%, 18%) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>Safe (20%)</span>
                  <span>Max (80%)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-sm font-semibold text-foreground">Duration</label>
                  <span className="text-sm font-bold text-primary">{duration} months</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={24}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-primary h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(160, 100%, 48%) 0%, hsl(160, 100%, 48%) ${((duration - 3) / 21) * 100}%, hsl(195, 40%, 18%) ${((duration - 3) / 21) * 100}%, hsl(195, 40%, 18%) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>3 months</span>
                  <span>24 months</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex flex-col justify-between gap-6">
              <div className="glass-card p-8 text-center relative overflow-hidden" style={{ borderRadius: "1.25rem" }}>
                <div className="shimmer absolute inset-0 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-sm text-muted-foreground mb-3">Estimated Loan Amount</p>
                  <p className="stat-number text-5xl md:text-6xl mb-6">${calc.loanAmount}</p>

                  <div className="space-y-3 text-sm">
                    {[
                      { label: "Collateral Value (12-mo yield)", value: `$${calc.collateral}` },
                      { label: "Total Interest (8% APR)", value: `$${calc.interest}` },
                      { label: "Monthly Payment", value: `$${calc.monthly}` },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-t border-border/30">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="text-foreground font-semibold">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="btn-gradient w-full py-4 rounded-2xl font-semibold text-primary-foreground text-base flex items-center justify-center gap-2">
                Apply for Pre‑approval
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70 mt-8 text-center leading-relaxed">
            * Simulation based on 12‑month projected yield. Actual loan terms subject to oracle‑verified hardware performance and risk parameters.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default LoanCalculator;
