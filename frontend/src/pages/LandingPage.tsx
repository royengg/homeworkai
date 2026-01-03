
import { Hero } from '../components/Hero';
import { FileUpload } from '../components/FileUpload';
import { StepCard } from '../components/StepCard';
import { Navbar } from '../components/Navbar';
import Footer from '../components/Footer';

export function LandingPage() {
  return (
    <div className="bg-brand-background-light dark:bg-[#0A0A0A] min-h-screen flex flex-col font-space selection:bg-brand-primary/20 relative overflow-x-hidden w-full max-w-[100vw]">
      {/* Global Noise Overlay */}
      <div className="fixed inset-0 z-[5] pointer-events-none opacity-[0.10] invert dark:invert-0 dark:opacity-[0.07] bg-noise"></div>
      
      <div className="absolute inset-0 z-0 h-full w-full bg-dot-black/[0.2] dark:bg-dot-white/[0.1] opacity-[0.3] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      {/* Sticky Navigation */}
      <Navbar />

      <main className="flex-grow w-full max-w-6xl mx-auto px-6 pt-20 md:pt-32 relative z-10 flex flex-col items-center">
        <Hero />

        <section className="w-full max-w-4xl mx-auto mt-8 md:mt-16">
          <FileUpload />
        </section>

        <section className="w-full mt-16 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full">
            <StepCard 
              number="01"
              title="Upload"
              description="Simply drag and drop your assignment file. We securely process your document instantly."
            />
            <StepCard 
              number="02"
              title="AI Analysis"
              description="Our advanced model parses complex problems, recognizing formulas and handwritten text."
            />
            <StepCard 
              number="03"
              title="Download Solution"
              description="Receive a clean, step-by-step solution document ready for study or submission."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
