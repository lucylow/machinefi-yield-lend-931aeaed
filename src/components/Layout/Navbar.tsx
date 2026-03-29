import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import {
  Menu,
  X,
  ChevronDown,
  Microchip,
  Wallet,
  BarChart3,
  Vote,
} from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [assetsDropdownOpen, setAssetsDropdownOpen] = useState(false);
  const [governanceDropdownOpen, setGovernanceDropdownOpen] = useState(false);
  const location = useLocation();
  const {
    isConnected,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    address,
    connectionError,
  } = useWeb3();

  const assetsWrapRef = useRef<HTMLDivElement>(null);
  const govWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAssetsDropdownOpen(false);
    setGovernanceDropdownOpen(false);
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!assetsDropdownOpen && !governanceDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      const el = e.target as Node;
      if (assetsWrapRef.current?.contains(el) || govWrapRef.current?.contains(el)) return;
      setAssetsDropdownOpen(false);
      setGovernanceDropdownOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [assetsDropdownOpen, governanceDropdownOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
      isActive
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <nav
      className="fixed top-0 w-full bg-background/90 backdrop-blur-md border-b border-border/50 z-50"
      aria-label="Main"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center min-w-0">
            <Link
              to="/"
              className="flex items-center space-x-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Microchip className="text-primary h-6 w-6 shrink-0" aria-hidden />
              <span className="font-bold text-xl text-foreground truncate">
                MachineFi<span className="text-primary">Lend</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:gap-1 lg:gap-2">
            <NavLink to="/" className={navLinkClass} end>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/risk" className={navLinkClass}>
              Risk
            </NavLink>
            <NavLink to="/liquidations" className={navLinkClass}>
              Liquidations
            </NavLink>

            <div className="relative" ref={assetsWrapRef}>
              <button
                type="button"
                aria-expanded={assetsDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setAssetsDropdownOpen((o) => !o);
                  setGovernanceDropdownOpen(false);
                }}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Assets
                <ChevronDown className="ml-1 h-4 w-4 shrink-0" aria-hidden />
              </button>
              {assetsDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg bg-card border border-border py-1 z-50"
                  role="menu"
                >
                  <Link
                    to="/hardware"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setAssetsDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Microchip className="mr-2 h-4 w-4" /> My hardware
                  </Link>
                  <Link
                    to="/hardware/register"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setAssetsDropdownOpen(false)}
                    role="menuitem"
                  >
                    <span className="mr-2 text-lg leading-none">+</span> Register hardware
                  </Link>
                  <div className="border-t border-border my-1" />
                  <Link
                    to="/borrow"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setAssetsDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Wallet className="mr-2 h-4 w-4" /> Borrow
                  </Link>
                </div>
              )}
            </div>

            <div className="relative" ref={govWrapRef}>
              <button
                type="button"
                aria-expanded={governanceDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setGovernanceDropdownOpen((o) => !o);
                  setAssetsDropdownOpen(false);
                }}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Governance
                <ChevronDown className="ml-1 h-4 w-4 shrink-0" aria-hidden />
              </button>
              {governanceDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg bg-card border border-border py-1 z-50"
                  role="menu"
                >
                  <Link
                    to="/governance"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setGovernanceDropdownOpen(false)}
                    role="menuitem"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" /> Overview
                  </Link>
                  <Link
                    to="/dao"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setGovernanceDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Vote className="mr-2 h-4 w-4" /> DAO
                  </Link>
                  <Link
                    to="/protocol/revenue"
                    className="flex items-center px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setGovernanceDropdownOpen(false)}
                    role="menuitem"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" /> Protocol revenue
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isConnected && !isCorrectNetwork && (
              <button
                type="button"
                onClick={() => switchNetwork()}
                className="hidden md:inline-flex text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/30 hover:bg-destructive/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Wrong network — switch
              </button>
            )}
            {isConnected ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 bg-card border border-primary/40 rounded-lg text-primary text-xs font-mono font-medium tabular-nums">
                  {shortAddress}
                </span>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={connectWallet}
                  className="btn-gradient items-center px-4 py-2 rounded-full text-primary-foreground font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Connect wallet
                </button>
                {connectionError && (
                  <span
                    className="text-xs text-destructive max-w-[180px] truncate"
                    title={connectionError}
                  >
                    {connectionError}
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-nav-menu"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-md pb-4"
          >
            <div className="px-2 pt-2 pb-1 space-y-0.5">
              {[
                { to: "/", label: "Home", end: true },
                { to: "/dashboard", label: "Dashboard" },
                { to: "/risk", label: "Risk" },
                { to: "/liquidations", label: "Liquidations" },
                { to: "/hardware", label: "My hardware" },
                { to: "/hardware/register", label: "Register hardware" },
                { to: "/borrow", label: "Borrow" },
                { to: "/governance", label: "Governance" },
                { to: "/protocol/revenue", label: "Protocol revenue" },
                { to: "/dao", label: "DAO" },
              ].map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 rounded-lg text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              {isConnected && !isCorrectNetwork && (
                <button
                  type="button"
                  onClick={() => {
                    switchNetwork();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-destructive bg-destructive/10 border border-destructive/20"
                >
                  Wrong network — tap to switch
                </button>
              )}
              {isConnected ? (
                <div className="px-3 pt-2 flex flex-col gap-2 border-t border-border/50 mt-2">
                  <span className="text-xs font-mono text-muted-foreground">{shortAddress}</span>
                  <button
                    type="button"
                    onClick={() => {
                      disconnectWallet();
                      setIsOpen(false);
                    }}
                    className="text-left text-sm text-primary font-medium"
                  >
                    Disconnect wallet
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    connectWallet();
                    setIsOpen(false);
                  }}
                  className="w-full mt-2 mx-1 btn-gradient px-4 py-3 rounded-full text-primary-foreground font-semibold text-sm"
                >
                  Connect wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
