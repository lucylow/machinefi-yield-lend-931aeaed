import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LoanCalculator from "@/components/LoanCalculator";
import BNBChainSection from "@/components/BNBChainSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { ArchitectureStrip } from "@/components/protocol/ArchitectureStrip";
import { BnbChainNarrativeCard, ProtocolRiskCard, ProtocolThesisCard } from "@/components/protocol/NarrativeBlocks";
import { ContentGrid } from "@/components/Layout/ContentGrid";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <section className="px-6 py-16 max-w-6xl mx-auto" aria-labelledby="protocol-story-heading">
      <h2 id="protocol-story-heading" className="sr-only">
        Protocol overview
      </h2>
      <ContentGrid columns={3} className="mb-12">
        <ProtocolThesisCard />
        <ProtocolRiskCard />
        <BnbChainNarrativeCard />
      </ContentGrid>
      <ArchitectureStrip />
    </section>
    <FeaturesSection />
    <HowItWorksSection />
    <LoanCalculator />
    <BNBChainSection />
    <CTASection />
    <Footer />
  </div>
);

export default Index;
