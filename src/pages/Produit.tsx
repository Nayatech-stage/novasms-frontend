import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Mail, MessageSquare, Check, BarChart3, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Produit() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased">
      {/* NAVBAR */}
      <PublicNavbar isScrolled={isScrolled} activePath="/produit" />

      {/* Hero Produit */}
      <main className="pub-section pt-32 pb-24 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h1 className="pub-hero-h1 font-headline text-5xl lg:text-6xl font-extrabold text-secondary tracking-tight mb-6">
              Une plateforme tout-en-un pour votre marketing
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              SMS, Email, WhatsApp et automatisations avancées. Tout ce dont vous avez besoin pour
              engager vos clients avec précision.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="pub-features-grid grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 lg:mb-24">
            {[
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'SMS Ultra-Rapide',
                desc: "Délivrance en moins de 5 secondes avec un taux d'ouverture de 98%. Parfait pour les communications urgentes et les promotions flash.",
                features: [
                  'Routage premium',
                  'Liens trackés',
                  'STOP SMS automatique',
                  'Personnalisation avancée',
                ],
              },
              {
                icon: <Mail className="w-8 h-8" />,
                title: 'Email Marketing',
                desc: 'Créez des campagnes email professionnelles avec notre éditeur drag-and-drop et automatisez vos parcours clients.',
                features: [
                  'Templates responsive',
                  'A/B testing',
                  'Segmentation avancée',
                  'Analytics détaillés',
                ],
              },
              {
                icon: <MessageSquare className="w-8 h-8" />,
                title: 'WhatsApp Business',
                desc: "Engagez des conversations bidirectionnelles riches avec l'API officielle WhatsApp Business.",
                features: [
                  'Messages média',
                  'Boutons interactifs',
                  'Chatbots intelligents',
                  'Support client 24/7',
                ],
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: 'Analytics Avancés',
                desc: 'Suivez chaque campagne en temps réel avec des rapports détaillés et des insights actionnables.',
                features: ["Taux d'ouverture", 'Taux de clic', 'Heatmaps', 'Export CSV/PDF'],
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: 'Automatisations',
                desc: 'Créez des workflows complexes basés sur le comportement de vos contacts pour maximiser vos conversions.',
                features: [
                  'Déclencheurs multiples',
                  'Conditions avancées',
                  'Workflows visuels',
                  'Tests A/B intégrés',
                ],
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Sécurité & Conformité',
                desc: 'Vos données sont protégées avec les normes les plus strictes du secteur (RGPD, PCI-DSS).',
                features: [
                  'Chiffrement TLS 1.3',
                  '2FA obligatoire',
                  'Audit logs',
                  'Backup automatique',
                ],
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-2xl border border-outline-variant/30 hover:border-primary/50 hover:shadow-xl transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all mb-6">
                  {feature.icon}
                </div>
                <h3 className="font-headline text-2xl font-bold text-secondary mb-3">
                  {feature.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed mb-6">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm font-semibold text-secondary/70"
                    >
                      <Check className="w-4 h-4 text-primary" /> {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-secondary pub-cta-section rounded-[32px] p-12 lg:p-20 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                Prêt à découvrir NovaSMS ?
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Commencez votre essai gratuit de 14 jours. Aucune carte de crédit requise.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-primary text-white font-bold py-5 px-12 rounded-xl text-lg hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
                >
                  Démarrer gratuitement
                </button>
                <button
                  onClick={() => navigate('/tarifs')}
                  className="bg-white/10 text-white font-bold py-5 px-10 rounded-xl text-lg hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  Voir les tarifs
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer simple */}
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
