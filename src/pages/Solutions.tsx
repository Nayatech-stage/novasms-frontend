import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  GraduationCap,
  Stethoscope,
  Building2,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Solutions() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sectors = [
    {
      icon: <ShoppingBag className="w-12 h-12" />,
      title: 'E-commerce & Retail',
      desc: 'Augmentez vos ventes avec des campagnes ciblées et des automatisations de panier abandonné.',
      stats: [
        { label: 'Taux de conversion', value: '+35%' },
        { label: 'Paniers récupérés', value: '28%' },
        { label: 'ROI moyen', value: '420%' },
      ],
      useCases: [
        'Promotions flash',
        'Relance panier',
        'Fidélisation clients',
        'Nouveautés produits',
      ],
    },
    {
      icon: <GraduationCap className="w-12 h-12" />,
      title: 'Éducation & Formation',
      desc: 'Communiquez efficacement avec vos étudiants et améliorez leur engagement.',
      stats: [
        { label: "Taux d'ouverture", value: '94%' },
        { label: 'Présence aux cours', value: '+22%' },
        { label: 'Satisfaction', value: '4.8/5' },
      ],
      useCases: ['Rappels de cours', 'Résultats examens', 'Inscriptions', 'Événements campus'],
    },
    {
      icon: <Stethoscope className="w-12 h-12" />,
      title: 'Santé & Bien-être',
      desc: "Améliorez l'expérience patient avec des rappels automatisés et un suivi personnalisé.",
      stats: [
        { label: 'Rendez-vous honorés', value: '+40%' },
        { label: 'No-show réduit', value: '-65%' },
        { label: 'Patients satisfaits', value: '96%' },
      ],
      useCases: ['Rappels RDV', 'Ordonnances', 'Suivi traitement', 'Campagnes prévention'],
    },
    {
      icon: <Building2 className="w-12 h-12" />,
      title: 'Services Professionnels',
      desc: 'Automatisez votre communication client et gagnez en productivité.',
      stats: [
        { label: 'Temps gagné', value: '15h/semaine' },
        { label: 'Satisfaction client', value: '4.9/5' },
        { label: 'Taux de réponse', value: '87%' },
      ],
      useCases: ['Confirmations RDV', 'Factures', 'Relances', 'Newsletter expertise'],
    },
    {
      icon: <Utensils className="w-12 h-12" />,
      title: 'Restauration & Hôtellerie',
      desc: 'Fidélisez votre clientèle et optimisez vos réservations.',
      stats: [
        { label: 'Réservations en ligne', value: '+55%' },
        { label: 'Clients fidèles', value: '+38%' },
        { label: 'CA supplémentaire', value: '+25%' },
      ],
      useCases: ['Réservations', 'Promos spéciales', 'Anniversaires', 'Avis clients'],
    },
    {
      icon: <TrendingUp className="w-12 h-12" />,
      title: 'Finance & Assurance',
      desc: 'Communiquez en toute sécurité avec vos clients et respectez la conformité.',
      stats: [
        { label: 'Conformité RGPD', value: '100%' },
        { label: "Taux d'ouverture", value: '91%' },
        { label: 'Sécurité', value: 'Bank-grade' },
      ],
      useCases: ['Alertes transactions', 'Échéances', 'Nouveaux produits', 'Rappels paiements'],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased">
      {/* NAVBAR */}
      <PublicNavbar isScrolled={isScrolled} activePath="/solutions" />

      {/* Hero */}
      <main className="pub-section pt-32 pb-24 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h1 className="pub-hero-h1 font-headline text-5xl lg:text-6xl font-extrabold text-secondary tracking-tight mb-6">
              Des solutions adaptées à votre secteur
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              Que vous soyez e-commerce, santé, éducation ou services, NovaSMS s'adapte à vos
              besoins spécifiques.
            </p>
          </motion.div>

          {/* Sectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sectors.map((sector, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-3xl border border-outline-variant/30 hover:border-primary/50 hover:shadow-2xl transition-all group"
              >
                <div className="w-20 h-20 rounded-2xl bg-surface-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all mb-6">
                  {sector.icon}
                </div>
                <h3 className="font-headline text-3xl font-bold text-secondary mb-4">
                  {sector.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed mb-8 text-lg">
                  {sector.desc}
                </p>

                {/* Stats */}
                <div className="pub-stats-grid grid grid-cols-3 gap-4 mb-8">
                  {sector.stats.map((stat, idx) => (
                    <div key={idx} className="text-center p-4 bg-surface-variant/30 rounded-xl">
                      <p className="text-2xl font-black text-primary mb-1">{stat.value}</p>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Use Cases */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-secondary/60 uppercase tracking-wider">
                    Cas d'usage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sector.useCases.map((useCase, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-primary/5 text-primary text-sm font-semibold rounded-lg border border-primary/20"
                      >
                        {useCase}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 lg:mt-24 bg-gradient-to-br from-primary/10 to-secondary/10 pub-cta-section rounded-[32px] p-12 lg:p-20 text-center border border-outline-variant/30"
          >
            <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-secondary tracking-tight mb-6">
              Votre secteur n'est pas listé ?
            </h2>
            <p className="text-lg text-on-surface-variant mb-10 max-w-2xl mx-auto">
              Contactez-nous pour discuter de vos besoins spécifiques. Nous avons probablement déjà
              une solution pour vous.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="bg-secondary text-white font-bold py-5 px-12 rounded-xl text-lg hover:bg-secondary/90 transition-all shadow-xl shadow-secondary/10"
            >
              Parler à un expert
            </button>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
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
