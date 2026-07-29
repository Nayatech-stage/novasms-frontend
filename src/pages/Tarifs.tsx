import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Tarifs() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: 'Démarrage',
      price: '0',
      period: '/mois',
      desc: 'Idéal pour tester la plateforme et envoyer vos premières campagnes.',
      features: [
        "14 jours d'essai gratuit",
        '500 crédits offerts',
        '1 canal (SMS)',
        'Support communauté',
        'Analytics basiques',
      ],
      cta: 'Essayer gratuitement',
      popular: false,
    },
    {
      name: 'Professionnel',
      price: '29 000',
      period: 'FCFA/mois',
      desc: 'Pour les entreprises qui veulent automatiser et scaler leur marketing.',
      features: [
        '5 000 crédits inclus',
        'SMS + Email + WhatsApp',
        'Automatisations avancées',
        'Support prioritaire',
        'API complète',
        'Analytics temps réel',
      ],
      cta: 'Commencer maintenant',
      popular: true,
    },
    {
      name: 'Entreprise',
      price: 'Sur mesure',
      period: '',
      desc: 'Solutions dédiées pour les grands volumes et les besoins spécifiques.',
      features: [
        'Crédits illimités',
        'IP dédiée & SLA 99.9%',
        'Account manager dédié',
        'Intégrations sur mesure',
        'Formation équipe',
        'Conformité RGPD avancée',
      ],
      cta: 'Contacter les ventes',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased">
      {/* NAVBAR */}
      <PublicNavbar isScrolled={isScrolled} activePath="/tarifs" />

      <main className="pub-section pt-32 pb-24 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h1 className="pub-hero-h1 font-headline text-5xl lg:text-6xl font-extrabold text-secondary tracking-tight mb-6">
              Des tarifs transparents, sans surprise
            </h1>
            <p className="text-xl text-on-surface-variant">
              Choisissez le plan qui correspond à votre volume. Évoluez ou downgradez à tout moment.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 lg:mb-20">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white p-8 rounded-3xl border ${plan.popular ? 'border-primary shadow-xl md:scale-105 pub-plan-popular' : 'border-outline-variant/30'} transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    Le plus populaire
                  </div>
                )}
                <h3 className="font-headline text-2xl font-bold text-secondary mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-secondary">{plan.price}</span>
                  <span className="text-on-surface-variant">{plan.period}</span>
                </div>
                <p className="text-sm text-on-surface-variant mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-secondary/80">
                      <Check className="w-4 h-4 text-primary" /> {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${plan.popular ? 'bg-primary text-white hover:brightness-110' : 'bg-surface-variant text-secondary hover:bg-surface-variant/70'}`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>

          <div className="bg-secondary pub-cta-section rounded-[32px] p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 space-y-6">
              <h2 className="font-headline text-4xl font-extrabold text-white">
                Vous hésitez encore ?
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Profitez de 14 jours gratuits sur le plan Professionnel. Aucune carte requise.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="bg-primary text-white font-bold py-5 px-12 rounded-xl text-lg hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
              >
                Démarrer l'essai gratuit
              </button>
            </div>
          </div>
        </div>
      </main>

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
            <a href="#" className="hover:text-primary">
              Confidentialité
            </a>
            <a href="#" className="hover:text-primary">
              Conditions
            </a>
            <a href="#" className="hover:text-primary">
              Support
            </a>
          </div>
          <p className="text-sm text-secondary/40">© 2026 NovaSMS Inc.</p>
        </div>
      </footer>
    </div>
  );
}
