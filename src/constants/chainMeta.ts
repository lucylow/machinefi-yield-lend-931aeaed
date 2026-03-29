export const BNB_STACK = [
  {
    id: "bsc",
    name: "BNB Smart Chain",
    role: "Settlement & core lending state",
    accent: "from-cyan-500/20 to-teal-500/10",
  },
  {
    id: "opbnb",
    name: "opBNB",
    role: "High-frequency yield & activity tracking",
    accent: "from-teal-500/20 to-emerald-500/10",
  },
  {
    id: "greenfield",
    name: "BNB Greenfield",
    role: "Proof storage & tamper-resistant evidence",
    accent: "from-amber-500/15 to-yellow-500/10",
  },
] as const;

export const CHAIN_IDS = {
  bscTestnet: 97,
  bscMainnet: 56,
} as const;
