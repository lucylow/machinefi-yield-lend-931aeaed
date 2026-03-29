import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Twitter", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Docs", href: "#" },
  { label: "Discord", href: "#" },
];

const Footer = () => (
  <footer className="border-t border-border/30 py-12 px-6">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="text-lg font-bold gradient-text">MachineFi Lend</span>
        </Link>

        <div className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="section-divider mb-6" />

      <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground/60">
        <p>© 2026 MachineFi Lending Pool | DePIN × RWA Infrastructure on BNB Chain</p>
        <p>Demo for BNB Chain RWA Demo Day · Not financial advice</p>
      </div>
    </div>
  </footer>
);

export default Footer;
