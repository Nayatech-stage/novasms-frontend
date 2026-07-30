import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import PublicNavbar from '@/components/PublicNavbar';

// Animations
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* NAVBAR */}
      <PublicNavbar isScrolled={isScrolled} activePath="/" />

      {/* HERO SECTION */}
      <main className="relative pt-28 lg:pt-48 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-12 hero-gradient overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary">
                Marketing de Précision{' '}
              </span>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <h1 className="pub-hero-h1 font-headline text-5xl lg:text-7xl font-extrabold text-secondary leading-[1.1] tracking-tight">
                Convertissez chaque <span className="text-primary italic">clic</span> en client
                fidèle.
              </h1>
              <p className="text-lg lg:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
                Plateforme unifiée pour SMS, Email et WhatsApp. Automatisez vos workflows avec une
                intelligence de données chirurgicale pour un ROI maximal.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-5"
            >
              <a
                href="/register"
                className="pub-hero-btn bg-secondary text-white font-bold py-4 px-10 rounded-xl hover:bg-secondary/90 transition-all shadow-xl shadow-secondary/10 flex items-center justify-center gap-3"
              >
                Démarrer gratuitement
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
              <button className="pub-hero-btn bg-white border border-outline text-secondary font-bold py-4 px-8 rounded-xl hover:bg-surface-variant/30 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Regarder la démo
              </button>
            </motion.div>
          </div>

          {/* Right Content: Interactive Mockup */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl border border-outline-variant/40 p-8 space-y-8 relative z-10"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-1">
                    Délivrabilité Moyenne
                  </p>
                  <h4 className="text-4xl font-black text-secondary">99.8%</h4>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  +4.2%
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-variant/40 rounded-xl flex items-center justify-between border border-outline/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">Promo Flash</p>
                      <p className="text-[10px] text-on-surface-variant">Envoyé il y a 2m</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">82% Clics</p>
                  </div>
                </div>

                <div className="p-4 bg-surface-variant/20 rounded-xl flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">Newsletter</p>
                      <p className="text-[10px] text-on-surface-variant">Planifié</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-32 w-full flex items-end justify-between gap-1">
                {[1 / 2, 2 / 3, 1 / 3, 3 / 4, 1, 2 / 3, 1 / 2].map((height, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-full ${i === 4 ? 'bg-primary h-full' : 'bg-primary/20'}`}
                    style={{ height: `${height * 100}%` }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0"></div>
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-secondary/5 rounded-full blur-2xl -z-0"></div>
          </div>
        </div>
      </main>

      {/* FEATURES SECTION */}
      <section className="pub-section py-24 px-4 sm:px-6 lg:px-12 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-2xl space-y-4">
              <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-secondary tracking-tight">
                Une ingénierie dédiée à votre croissance
              </h2>
              <p className="text-lg text-on-surface-variant">
                Oubliez les outils de masse. Nous avons construit une plateforme de haute précision
                pour les marketeurs exigeants.
              </p>
            </div>
            <a
              href="#all-features"
              className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all mb-2"
            >
              Voir toutes les fonctionnalités
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>

          <div className="pub-features-grid grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* SMS Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-2xl font-bold text-secondary">
                  Canal SMS Ultra-Rapide
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  98% de taux d'ouverture. Idéal pour les communications critiques, les OTP et les
                  ventes flash de dernière minute.
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Délivrance &lt; 5 sec
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Liens trackés courts
                </li>
              </ul>
            </motion.div>

            {/* Email Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-6 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-2xl font-bold text-secondary">
                  Automatisation Email
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Créez des parcours complexes basés sur le comportement. Récupération de panier,
                  onboarding et fidélisation.
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  IA de prédiction d'heure
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Éditeur No-Code 2.0
                </li>
              </ul>
            </motion.div>

            {/* WhatsApp Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-6 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-2xl font-bold text-secondary">
                  WhatsApp Business Pro
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Engagez une conversation bidirectionnelle riche. Envoyez des médias et automatisez
                  le support avec nos bots.
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  API Officielle Business
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-secondary/70">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Boutons interactifs
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="pub-section py-24 px-4 sm:px-6 lg:px-12 bg-surface-variant/30 border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="font-headline text-4xl font-extrabold text-secondary tracking-tight">
              Plus de 8,000 entreprises nous font confiance.
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="precision-border pl-6 space-y-1">
                <p className="text-3xl font-black text-secondary">15M+</p>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Messages/mois
                </p>
              </div>
              <div className="precision-border pl-6 space-y-1">
                <p className="text-3xl font-black text-secondary">2.4x</p>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Augmentation ROI
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/30 relative">
            <div className="flex items-center gap-1 text-primary mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="text-lg italic text-secondary leading-relaxed mb-8">
              "NovaSMS a radicalement changé notre façon de communiquer. Leur précision sur le
              ciblage nous a permis de doubler nos conversions en moins de 3 mois."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                KR
              </div>
              <div>
                <p className="font-bold text-secondary">Konan romuald</p>
                <p className="text-xs text-on-surface-variant font-medium">
                  Abidjan, Côte d'Ivoire
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pub-section py-24 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto bg-secondary pub-cta-section rounded-[32px] p-12 lg:p-24 text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2"></div>

          <div className="relative z-10 space-y-6">
            <h2 className="font-headline text-4xl lg:text-6xl font-extrabold text-white tracking-tight">
              Prêt à passer à la précision ?
            </h2>
            <p className="text-white/70 text-lg lg:text-xl max-w-2xl mx-auto">
              Rejoignez les leaders du marché et commencez à envoyer des campagnes qui comptent
              vraiment.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="bg-primary text-white font-bold py-5 px-12 rounded-xl text-lg hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
            >
              Créer mon compte gratuit
            </a>
            <button className="bg-white/10 text-white font-bold py-5 px-10 rounded-xl text-lg hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20">
              Parler à un expert
            </button>
          </div>

          <p className="relative z-10 text-white/40 text-sm font-medium">
            Pas de carte de crédit requise. 14 jours d'essai gratuit.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 sm:px-6 lg:px-12 border-t border-outline-variant/20 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tight text-secondary">
              NovaSMS
            </span>
          </div>

          <div className="pub-footer-links flex gap-6 text-sm font-semibold text-secondary/60">
            <a href="#" className="hover:text-primary transition-colors">
              Confidentialité
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Conditions
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Support
            </a>
          </div>

          <p className="text-sm text-secondary/40">© 2026 NovaSMS Inc.</p>
        </div>
      </footer>
    </div>
  );
}
