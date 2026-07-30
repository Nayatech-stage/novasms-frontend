/**
 * OnboardingTour — Tour interactif driver.js pour les nouveaux marchands.
 *
 * Stratégie multi-pages :
 * - Le tour est découpé en "phases", chaque phase appartenant à une page.
 * - La phase courante est persistée dans localStorage (novasms_tour_phase).
 * - Quand l'utilisateur clique "Suivant" sur le dernier step d'une phase,
 *   le composant navigue vers la page suivante et reprend automatiquement.
 * - Le tour se déclenche uniquement si isFirstLogin === true ET que le tour
 *   n'a pas déjà été complété (novasms_tour_done = "1").
 */

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const TOUR_PHASE_KEY = 'novasms_tour_phase';
const TOUR_DONE_KEY = 'novasms_tour_done';

interface PhaseStep {
  element?: string;
  title: string;
  desc: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

interface TourPhase {
  page: string;
  steps: PhaseStep[];
  nextPage?: string;
}

const TOUR_PHASES: TourPhase[] = [
  {
    page: '/dashboard',
    steps: [
      {
        title: '👋 Bienvenue sur NovaSMS !',
        desc: 'Laissez-nous vous faire découvrir votre espace en quelques secondes. Vous pouvez quitter le guide à tout moment en appuyant sur <b>Échap</b>.',
        align: 'center',
      },
      {
        element: '#tour-kpi-grid',
        title: '📊 Vos métriques en temps réel',
        desc: "Messages envoyés, taux d'ouverture, clics, désabonnements — tous vos KPIs s'actualisent automatiquement.",
        side: 'top',
      },
      {
        element: '#tour-sidebar-credits',
        title: '💳 Crédits disponibles',
        desc: 'Votre solde de crédits SMS et Email. La barre de progression vous alerte quand vous approchez du seuil minimum. Cliquez sur <b>Recharger</b> pour ajouter des crédits via Mobile Money ou Visa.',
        side: 'right',
      },
      {
        element: '#tour-nav-contacts',
        title: '👥 Contacts — étape suivante',
        desc: "Importez jusqu'à 50 000 contacts via CSV, créez des segments dynamiques et gérez le consentement RGPD. Découvrons cette section.",
        side: 'right',
      },
    ],
    nextPage: '/contacts',
  },
  {
    page: '/contacts',
    steps: [
      {
        element: '#tour-import-btn',
        title: '📥 Importer vos contacts',
        desc: "Glissez-déposez votre fichier CSV ou XLS. Mappez les colonnes (prénom, email, téléphone…) et importez en masse. Les fichiers jusqu'à 50 000 contacts sont traités en blocs pour éviter les timeouts.",
        side: 'bottom',
      },
      {
        element: '#tour-search-input',
        title: '🔍 Recherche & filtres',
        desc: 'Tapez un nom, email ou téléphone pour filtrer vos contacts instantanément. Utilisez les filtres de statut (actif / inactif) et de tags pour affiner votre liste.',
        side: 'bottom',
      },
      {
        element: '#tour-segments-btn',
        title: '🎯 Segments dynamiques',
        desc: 'Créez des audiences ciblées qui se mettent à jour automatiquement : <b>Clients VIP Abidjan</b>, <b>Inactifs depuis 30 jours</b>, <b>Tag = NEWSLETTER</b>. Idéal pour des campagnes ultra-personnalisées.',
        side: 'bottom',
      },
      {
        element: '#tour-nav-campaigns',
        title: '📧 Campagnes — prochaine étape',
        desc: 'Une fois vos contacts importés, créez votre première campagne Email ou SMS. Allons voir ça.',
        side: 'right',
      },
    ],
    nextPage: '/campaigns',
  },
  {
    page: '/campaigns',
    steps: [
      {
        element: '#tour-new-campaign-btn',
        title: '📧 Créer une campagne',
        desc: "Cliquez ici pour lancer l'éditeur de campagne. Choisissez le canal (Email / SMS), sélectionnez votre audience parmi vos segments, puis composez votre message avec l'éditeur par blocs.",
        side: 'bottom',
      },
      {
        title: '🅰🅱 Test A/B intelligent',
        desc: "Comparez deux versions de votre email : objet, contenu, heure d'envoi. NovaSMS envoie la version A à 50 % de votre audience et la version B à l'autre moitié — vous identifiez la meilleure version avant l'envoi final.",
        align: 'center',
      },
      {
        title: '📅 Planification & rapports',
        desc: "Envoyez immédiatement ou planifiez à l'heure optimale. Chaque campagne génère un rapport complet : taux d'ouverture, clics, désabonnements, bounces, heatmap des zones de clic par lien.",
        align: 'center',
      },
      {
        element: '#tour-nav-automations',
        title: '⚡ Automatisations — prochaine étape',
        desc: 'Envoyez des messages déclenchés automatiquement par des actions de vos contacts (inscription, achat, anniversaire…).',
        side: 'right',
      },
    ],
    nextPage: '/automations',
  },
  {
    page: '/automations',
    steps: [
      {
        element: '#tour-automations-header',
        title: '⚡ Workflows automatisés',
        desc: 'Créez des séquences de messages déclenchées automatiquement : e-mail de bienvenue, relance panier abandonné, séquence anniversaire… Tout tourne sans intervention manuelle.',
        side: 'bottom',
      },
      {
        title: '🖱️ Canvas de workflow',
        desc: 'Dessinez votre workflow par glisser-déposer : ajoutez un <b>déclencheur</b> (ex : nouvelle inscription), puis enchaînez des nœuds <b>Email</b>, <b>SMS</b>, <b>Délai</b> ou <b>Condition</b>. Chaque branche peut mener à une action différente.',
        align: 'center',
      },
      {
        title: '⚙️ Déclencheurs disponibles',
        desc: '<b>Inscription</b>, achat, anniversaire, clic sur lien, inactivité 30 jours, tag ajouté… Combinez plusieurs déclencheurs avec des conditions booléennes (ET / OU) pour des scénarios complexes.',
        align: 'center',
      },
      {
        element: '#tour-nav-analytics',
        title: '📈 Analytics — prochaine étape',
        desc: "Analysez les performances de toutes vos campagnes avec des graphiques détaillés et une heat map d'engagement.",
        side: 'right',
      },
    ],
    nextPage: '/analytics',
  },
  {
    page: '/analytics',
    steps: [
      {
        element: '#tour-analytics-header',
        title: '📈 Rapport Analytics',
        desc: "Taux d'ouverture, clics, désabonnements, top campagnes, répartition par canal — tout est là pour optimiser vos envois.",
        side: 'bottom',
      },
      {
        title: '📊 Analyse approfondie',
        desc: "Filtrez par <b>période</b>, <b>canal</b> ou <b>campagne</b>. Exportez en CSV pour votre reporting. La <b>heatmap</b> des clics révèle quelles zones de vos emails attirent le plus l'attention de vos clients.",
        align: 'center',
      },
      {
        element: '#tour-nav-rechargement',
        title: '💰 Recharge — prochaine étape',
        desc: 'Rechargez vos crédits via Mobile Money ou Visa. Un reçu PDF est généré automatiquement à chaque paiement.',
        side: 'right',
      },
    ],
    nextPage: '/rechargement',
  },
  {
    page: '/rechargement',
    steps: [
      {
        element: '#tour-rechargement-header',
        title: '💰 Recharge de crédits',
        desc: 'Rechargez en 30 secondes via <b>Mobile Money</b> (Orange, MTN, Wave, Moov) avec code OTP, ou par <b>Carte Visa</b>. Votre solde est crédité instantanément. Un reçu PDF est disponible pour chaque transaction.',
        side: 'top',
      },
      {
        title: '🔒 Sécurité du compte',
        desc: "Dans le menu <b>Compte → Sécurité</b>, activez la <b>double authentification 2FA</b> (application TOTP) pour protéger votre espace. Changez votre mot de passe et consultez le journal d'audit de toutes les actions effectuées.",
        align: 'center',
      },
      {
        title: "👥 Gestion de l'équipe",
        desc: 'Dans <b>Compte → Équipe</b>, invitez des collaborateurs et attribuez des rôles : <b>Administrateur</b> (accès complet), <b>Éditeur</b> (campagnes uniquement) ou <b>Analyste</b> (lecture seule des rapports).',
        align: 'center',
      },
      {
        title: '🔌 Intégrations & Paramètres',
        desc: "Configurez vos fournisseurs d'envoi (Resend, Brevo, Africa's Talking, Twilio) dans <b>Intégrations</b> et vérifiez leur statut en temps réel. Dans <b>Paramètres</b>, personnalisez les seuils d'alerte crédits et l'identité d'expéditeur.",
        align: 'center',
      },
      {
        title: '🎉 Vous êtes prêt !',
        desc: 'Félicitations ! Vous avez fait le tour complet de NovaSMS. Retournez sur le tableau de bord et créez votre première campagne pour commencer à engager vos clients.',
        align: 'center',
      },
    ],
    // no nextPage = dernière phase
  },
];

export default function OnboardingTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = useAuthStore((s) => s.isFirstLogin);
  const markOnboardingCompleted = useAuthStore((s) => s.markOnboardingCompleted);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const suppressDestroyRef = useRef(false);

  const destroyDriver = useCallback(() => {
    if (!driverRef.current) {
      return;
    }

    suppressDestroyRef.current = true;
    driverRef.current.destroy();
    driverRef.current = null;

    queueMicrotask(() => {
      suppressDestroyRef.current = false;
    });
  }, []);

  const completeTour = useCallback(async () => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    localStorage.removeItem(TOUR_PHASE_KEY);
    destroyDriver();
    try {
      await markOnboardingCompleted();
    } catch {
      // silent — ne pas bloquer l'UI si l'API échoue
    }
  }, [destroyDriver, markOnboardingCompleted]);

  const launchPhase = useCallback(
    (phaseIndex: number) => {
      destroyDriver();

      const phase = TOUR_PHASES[phaseIndex];
      if (!phase) {
        void completeTour();
        return;
      }

      const isLastPhase = phaseIndex === TOUR_PHASES.length - 1;

      const driverSteps = phase.steps.map((step, stepIdx) => {
        const isLastStepOfPhase = stepIdx === phase.steps.length - 1;
        // hasElement : le step déclare explicitement une cible DOM
        const hasElement = Boolean(step.element);
        // hasTarget : la cible est réellement présente dans le DOM
        const hasTarget = hasElement && Boolean(document.querySelector(step.element!));

        // N'afficher "indisponible" que si une cible était attendue mais absente
        const description =
          hasElement && !hasTarget
            ? `${step.desc}<br/><small style="opacity:.75">(Cette zone est momentanément indisponible, le guide continue.)</small>`
            : step.desc;

        // Ne jamais passer onNextClick: undefined — driver.js l'interprète comme
        // un override vide et désactive le bouton. On l'ajoute seulement quand nécessaire.
        const popover: Record<string, unknown> = {
          title: step.title,
          description,
          side: step.side ?? 'bottom',
          align: step.align ?? 'start',
        };

        if (isLastStepOfPhase) {
          popover.onNextClick = () => {
            if (phase.nextPage) {
              const nextPhase = phaseIndex + 1;
              localStorage.setItem(TOUR_PHASE_KEY, String(nextPhase));
              destroyDriver();
              navigate(phase.nextPage);
            } else {
              void completeTour();
            }
          };
        }

        return {
          element: hasTarget ? step.element : undefined,
          popover,
        };
      });

      const dObj = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 10,
        popoverClass: 'novasms-tour-popover',
        nextBtnText: isLastPhase && phase.steps.length === 1 ? 'Terminer 🎉' : 'Suivant →',
        prevBtnText: '← Précédent',
        doneBtnText: isLastPhase ? 'Terminer 🎉' : 'Suivant →',
        onDestroyStarted: () => {
          if (suppressDestroyRef.current) {
            return;
          }
          // Utilisateur a fermé manuellement (Échap ou overlay) → marquer comme fait
          void completeTour();
        },
        steps: driverSteps,
      });

      driverRef.current = dObj;
      dObj.drive();
    },
    [navigate, completeTour, destroyDriver],
  );

  // Quand isFirstLogin passe à true (nouvelle connexion), effacer toute trace du tour précédent
  // pour que le tour redémarre correctement même si localStorage a été set lors d'un test antérieur
  useEffect(() => {
    if (isFirstLogin) {
      localStorage.removeItem(TOUR_DONE_KEY);
      localStorage.removeItem(TOUR_PHASE_KEY);
    }
  }, [isFirstLogin]);

  useEffect(() => {
    // Ne pas lancer si tour déjà complété
    const tourDone = localStorage.getItem(TOUR_DONE_KEY);
    if (tourDone) return;

    // Ne lancer que pour les nouveaux marchands
    if (!isFirstLogin) return;

    const savedPhase = localStorage.getItem(TOUR_PHASE_KEY);
    const phaseIndex = savedPhase ? parseInt(savedPhase, 10) : 0;

    // Vérifier que la phase courante correspond à la page actuelle
    const phase = TOUR_PHASES[phaseIndex];
    if (!phase) {
      void completeTour();
      return;
    }

    if (location.pathname !== phase.page) {
      // Mauvaise page — naviguer vers la bonne
      if (phaseIndex === 0) navigate(TOUR_PHASES[0].page);
      return;
    }

    // Délai pour laisser les éléments DOM se rendre complètement
    const timer = setTimeout(() => {
      launchPhase(phaseIndex);
    }, 900);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isFirstLogin]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      destroyDriver();
    };
  }, [destroyDriver]);

  return null;
}
