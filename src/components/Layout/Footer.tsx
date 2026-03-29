import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-border/30 bg-card/50 backdrop-blur-sm">
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">MachineFi Lend</h3>
          <p className="text-muted-foreground text-sm">Unlock liquidity from your DePIN hardware and RWAs.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground/80">Protocol</h4>
          <ul className="space-y-2">
            <li><Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-sm">Dashboard</Link></li>
            <li><Link to="/borrow" className="text-muted-foreground hover:text-primary transition-colors text-sm">Borrow</Link></li>
            <li><Link to="/hardware" className="text-muted-foreground hover:text-primary transition-colors text-sm">Hardware</Link></li>
            <li><Link to="/governance" className="text-muted-foreground hover:text-primary transition-colors text-sm">Governance</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground/80">Resources</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Whitepaper</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">GitHub</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Audits</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground/80">Community</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Discord</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Twitter</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Telegram</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground/60 text-sm">
        <p>© 2026 MachineFi Lending Pool. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
