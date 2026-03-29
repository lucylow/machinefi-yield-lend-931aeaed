import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '@/contexts/Web3Context';

const DappNavbar = () => {
  const { address, isConnected, isCorrectNetwork, connectWallet, disconnectWallet, switchNetwork, connectionError } = useWeb3();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/borrow', label: 'Borrow' },
    { to: '/hardware', label: 'My Hardware' },
    { to: '/dao', label: 'DAO' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold gradient-text">MachineFi Lend</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`transition-colors ${isActive(link.to) ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isConnected && !isCorrectNetwork && (
            <button onClick={switchNetwork} className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/30">
              ⚠️ Wrong Network
            </button>
          )}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground glass-card px-3 py-1.5 !rounded-full text-xs">
                🟢 {shortAddress}
              </span>
              <button onClick={disconnectWallet} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={connectWallet} className="btn-gradient px-5 py-2 rounded-full text-sm font-semibold text-primary-foreground">
                🔗 Connect Wallet
              </button>
              {connectionError && (
                <span className="text-xs text-destructive max-w-[200px] truncate" title={connectionError}>
                  {connectionError}
                </span>
              )}
            </div>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 backdrop-blur-md px-6 py-4 flex flex-col gap-4 text-sm text-muted-foreground">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={isActive(link.to) ? 'text-primary' : ''}>
              {link.label}
            </Link>
          ))}
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs">🟢 {shortAddress}</span>
              <button onClick={disconnectWallet} className="text-xs">Disconnect</button>
            </div>
          ) : (
            <button onClick={connectWallet} className="btn-gradient px-5 py-2 rounded-full text-sm font-semibold text-primary-foreground w-fit">
              🔗 Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default DappNavbar;
