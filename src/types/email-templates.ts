/**
 * Email Template Library - 20+ Modèles Prêts à l'Emploi
 * Pour utilisation dans l'éditeur Email drag & drop
 */

import type { EmailContent } from '@/store/campaign.store';

export interface EmailTemplate {
  id: string;
  name: string;
  category:
    | 'bienvenue'
    | 'promo'
    | 'newsletter'
    | 'panier'
    | 'reengagement'
    | 'anniversaire'
    | 'seasonal'
    | 'service';
  thumbnail?: string;
  content: EmailContent;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // === BIENVENUE ===
  {
    id: 'welcome-1',
    name: 'Bienvenue Simple',
    category: 'bienvenue',
    content: {
      subject: 'Bienvenue chez {{boutique}} 🎉',
      preheader: 'Votre aventure commence ici',
      blocks: [
        {
          id: 'welcome-1-text-1',
          type: 'text',
          content: { text: 'Bonjour {{prénom}},' },
        },
        {
          id: 'welcome-1-text-2',
          type: 'text',
          content: {
            text: "Merci d'avoir rejoint notre communauté. Nous sommes ravi de vous accueillir!",
          },
        },
        {
          id: 'welcome-1-button-1',
          type: 'button',
          content: { text: 'Découvrir nos produits', url: 'https://novasms.ci' },
        },
      ],
    },
  },
  {
    id: 'welcome-2',
    name: 'Bienvenue Premium',
    category: 'bienvenue',
    content: {
      subject: '{{prénom}}, votre code exclusif est prêt ✨',
      preheader: '-20% sur votre première commande',
      blocks: [
        {
          id: 'welcome-2-text-1',
          type: 'text',
          content: { text: 'Bienvenue {{prénom}}!' },
        },
        {
          id: 'welcome-2-text-2',
          type: 'text',
          content: {
            text: 'En tant que nouveau membre, profitez de -20% sur votre première commande.',
          },
        },
        {
          id: 'welcome-2-text-3',
          type: 'text',
          content: { text: 'Code: {{code_promo}}' },
        },
        {
          id: 'welcome-2-button-1',
          type: 'button',
          content: { text: 'Commencer mes achats', url: 'https://novasms.ci/shop' },
        },
      ],
    },
  },
  {
    id: 'welcome-3',
    name: 'Onboarding Progressif',
    category: 'bienvenue',
    content: {
      subject: 'Complétez votre profil',
      preheader: '3 minutes pour débloquer les meilleurs offres',
      blocks: [
        {
          id: 'welcome-3-text-1',
          type: 'text',
          content: { text: 'Presque là {{prénom}}!' },
        },
        {
          id: 'welcome-3-text-2',
          type: 'text',
          content: {
            text: 'Votre profil est créé. En complétant vos préférences, vous recevrez des offres 100% personnalisées.',
          },
        },
        {
          id: 'welcome-3-button-1',
          type: 'button',
          content: { text: 'Compléter le profil', url: 'https://novasms.ci/profile' },
        },
      ],
    },
  },

  // === PROMOTIONS ===
  {
    id: 'promo-flash-sale',
    name: 'Vente Flash',
    category: 'promo',
    content: {
      subject: '⏰ {{prénom}}, -40% MAINTENANT (2h seulement)',
      preheader: 'La meilleure offre du mois',
      blocks: [
        {
          id: 'promo-flash-text-1',
          type: 'text',
          content: { text: 'ALERTE VENTE FLASH ⚡' },
        },
        {
          id: 'promo-flash-text-2',
          type: 'text',
          content: { text: '-40% sur une sélection de produits' },
        },
        {
          id: 'promo-flash-text-3',
          type: 'text',
          content: { text: "Valable jusqu'à 18h ce soir seulement!" },
        },
        {
          id: 'promo-flash-button-1',
          type: 'button',
          content: { text: "Profiter de l'offre", url: 'https://novasms.ci/sale' },
        },
      ],
    },
  },
  {
    id: 'promo-seasonal',
    name: 'Promotion Saisonnière',
    category: 'seasonal',
    content: {
      subject: 'Fêtes 2025 - Votre sélection exclusive',
      preheader: "Cadeaux parfaits jusqu'à -50%",
      blocks: [
        {
          id: 'promo-seasonal-text-1',
          type: 'text',
          content: { text: 'Célébrez en beauté 🎁' },
        },
        {
          id: 'promo-seasonal-text-2',
          type: 'text',
          content: {
            text: "Nos meilleurs cadeaux pour les fêtes sont là, avec jusqu'à -50% de réduction.",
          },
        },
        {
          id: 'promo-seasonal-button-1',
          type: 'button',
          content: { text: 'Voir la collection', url: 'https://novasms.ci/seasonal' },
        },
      ],
    },
  },
  {
    id: 'promo-loyalty',
    name: 'Récompense Fidélité',
    category: 'promo',
    content: {
      subject: '{{prénom}}, vous avez gagné 1000 points! 🏆',
      preheader: 'Échangez-les maintenant pour des réductions',
      blocks: [
        {
          id: 'loyalty-text-1',
          type: 'text',
          content: { text: 'Merci de votre fidélité!' },
        },
        {
          id: 'loyalty-text-2',
          type: 'text',
          content: { text: 'Vous avez accumulé 1000 points bonus pour vos 5 derniers achats.' },
        },
        {
          id: 'loyalty-button-1',
          type: 'button',
          content: { text: 'Utiliser mes points', url: 'https://novasms.ci/rewards' },
        },
      ],
    },
  },

  // === PANIER ABANDONNÉ ===
  {
    id: 'cart-reminder-1',
    name: 'Rappel Panier - Doux',
    category: 'panier',
    content: {
      subject: 'Vous avez oublié quelque chose {{prénom}}',
      preheader: 'Votre panier expire dans 24h',
      blocks: [
        {
          id: 'cart-remind-1-text-1',
          type: 'text',
          content: { text: 'Votre panier vous attend' },
        },
        {
          id: 'cart-remind-1-text-2',
          type: 'text',
          content: {
            text: "Vous aviez 3 articles en attente. Compléter votre achat avant que votre panier n'expire.",
          },
        },
        {
          id: 'cart-remind-1-button-1',
          type: 'button',
          content: { text: 'Revenir au panier', url: 'https://novasms.ci/cart' },
        },
      ],
    },
  },
  {
    id: 'cart-reminder-2',
    name: 'Rappel Panier - Urgence',
    category: 'panier',
    content: {
      subject: '⚠️ {{prénom}}, dernière chance - Code promo inclus',
      preheader: 'Votre panier expire dans 2h',
      blocks: [
        {
          id: 'cart-remind-2-text-1',
          type: 'text',
          content: { text: 'DERNIÈRE CHANCE' },
        },
        {
          id: 'cart-remind-2-text-2',
          type: 'text',
          content: { text: 'Votre panier sera supprimé dans 2 heures.' },
        },
        {
          id: 'cart-remind-2-text-3',
          type: 'text',
          content: { text: 'Nous vous offrons {{code_promo}} pour compléter votre commande!' },
        },
        {
          id: 'cart-remind-2-button-1',
          type: 'button',
          content: { text: 'Acheter maintenant', url: 'https://novasms.ci/checkout' },
        },
      ],
    },
  },

  // === NEWSLETTER ===
  {
    id: 'newsletter-content',
    name: 'Newsletter Premium',
    category: 'newsletter',
    content: {
      subject: 'Votre dose de tendances - Mai 2025',
      preheader: 'Découvrez les 5 produits à ne pas manquer',
      blocks: [
        {
          id: 'newsletter-text-1',
          type: 'text',
          content: { text: 'Actualités & Tendances' },
        },
        {
          id: 'newsletter-text-2',
          type: 'text',
          content: { text: 'Cette semaine chez {{boutique}}: les 5 produits les plus demandés' },
        },
        {
          id: 'newsletter-button-1',
          type: 'button',
          content: { text: "Lire l'article", url: 'https://novasms.ci/blog' },
        },
        {
          id: 'newsletter-divider-1',
          type: 'divider',
          content: {},
        },
        {
          id: 'newsletter-text-3',
          type: 'text',
          content: {
            text: "Spécial abonnés - Code EXCLUSIVE20 pour -20% sur l'ensemble du catalogue",
          },
        },
      ],
    },
  },

  // === RÉENGAGEMENT ===
  {
    id: 'reengagement-1',
    name: 'On vous manque',
    category: 'reengagement',
    content: {
      subject: '{{prénom}}, nous voulons vous revoir! 💔',
      preheader: 'Voici un cadeau spécial pour vous',
      blocks: [
        {
          id: 'reeng-text-1',
          type: 'text',
          content: { text: 'Cela fait longtemps!' },
        },
        {
          id: 'reeng-text-2',
          type: 'text',
          content: {
            text: 'Vous nous manquez {{prénom}}. Nous avons une surprise spéciale: -30% sur votre prochain achat.',
          },
        },
        {
          id: 'reeng-button-1',
          type: 'button',
          content: { text: 'Revenir parmi nous', url: 'https://novasms.ci/welcome-back' },
        },
      ],
    },
  },

  // === ANNIVERSAIRE ===
  {
    id: 'birthday-special',
    name: 'Bonus Anniversaire',
    category: 'anniversaire',
    content: {
      subject: 'Joyeux anniversaire {{prénom}}! 🎂',
      preheader: 'Un cadeau spécial vous attend',
      blocks: [
        {
          id: 'birthday-text-1',
          type: 'text',
          content: { text: 'Joyeux Anniversaire 🎉' },
        },
        {
          id: 'birthday-text-2',
          type: 'text',
          content: {
            text: 'Pour célébrer votre jour spécial, nous vous offrons {{code_promo}} - -50% sur tout!',
          },
        },
        {
          id: 'birthday-button-1',
          type: 'button',
          content: { text: 'Profiter de mon cadeau', url: 'https://novasms.ci/birthday' },
        },
      ],
    },
  },

  // === SERVICE ===
  {
    id: 'order-confirmation',
    name: 'Confirmation de Commande',
    category: 'service',
    content: {
      subject: 'Commande #12345 confirmée',
      preheader: 'Merci pour votre achat',
      blocks: [
        {
          id: 'order-text-1',
          type: 'text',
          content: { text: 'Commande confirmée!' },
        },
        {
          id: 'order-text-2',
          type: 'text',
          content: {
            text: 'Merci {{prénom}}! Votre commande #12345 a été reçue et sera traitée rapidement.',
          },
        },
        {
          id: 'order-text-3',
          type: 'text',
          content: { text: 'Montant: 45,000 FCFA | Livraison: 2-3 jours' },
        },
        {
          id: 'order-button-1',
          type: 'button',
          content: { text: 'Suivre ma commande', url: 'https://novasms.ci/tracking' },
        },
      ],
    },
  },
  {
    id: 'shipping-notification',
    name: 'Notification Expédition',
    category: 'service',
    content: {
      subject: 'Votre commande a été expédiée! 📦',
      preheader: 'Numéro de suivi: TRK123456',
      blocks: [
        {
          id: 'ship-text-1',
          type: 'text',
          content: { text: 'En route vers vous!' },
        },
        {
          id: 'ship-text-2',
          type: 'text',
          content: {
            text: 'Votre commande a quitté notre entrepôt et sera livrée dans 2-3 jours.',
          },
        },
        {
          id: 'ship-button-1',
          type: 'button',
          content: { text: 'Suivre le colis', url: 'https://novasms.ci/track/TRK123456' },
        },
      ],
    },
  },
  {
    id: 'delivery-confirmation',
    name: 'Livraison Complète',
    category: 'service',
    content: {
      subject: '✅ Votre colis a été livré!',
      preheader: 'Laissez un avis et gagnez 100 points',
      blocks: [
        {
          id: 'deliv-text-1',
          type: 'text',
          content: { text: 'Livraison confirmée! 📭' },
        },
        {
          id: 'deliv-text-2',
          type: 'text',
          content: { text: 'Votre colis est arrivé. Nous espérons que tout est parfait!' },
        },
        {
          id: 'deliv-button-1',
          type: 'button',
          content: { text: 'Laisser un avis', url: 'https://novasms.ci/review' },
        },
      ],
    },
  },
  {
    id: 'feedback-request',
    name: "Demande d'Avis",
    category: 'service',
    content: {
      subject: 'Comment était votre expérience {{prénom}}?',
      preheader: 'Votre avis compte beaucoup pour nous',
      blocks: [
        {
          id: 'feedback-text-1',
          type: 'text',
          content: { text: 'Nous aimerions votre avis!' },
        },
        {
          id: 'feedback-text-2',
          type: 'text',
          content: {
            text: 'Avez-vous apprécié votre achat? Aidez-nous à améliorer en partageant votre expérience.',
          },
        },
        {
          id: 'feedback-button-1',
          type: 'button',
          content: { text: 'Donner mon avis', url: 'https://novasms.ci/feedback' },
        },
      ],
    },
  },

  // === SPÉCIAL ===
  {
    id: 'referral-program',
    name: 'Programme Parrainage',
    category: 'promo',
    content: {
      subject: 'Parrainez vos amis et gagnez 5000 FCFA',
      preheader: 'Chaque ami = -10% pour vous',
      blocks: [
        {
          id: 'referral-text-1',
          type: 'text',
          content: { text: "Partagez l'amour 💚" },
        },
        {
          id: 'referral-text-2',
          type: 'text',
          content: { text: 'Pour chaque ami invité, vous recevez 5000 FCFA de crédits.' },
        },
        {
          id: 'referral-button-1',
          type: 'button',
          content: { text: 'Obtenir mon lien', url: 'https://novasms.ci/refer' },
        },
      ],
    },
  },
  {
    id: 'vip-upgrade',
    name: 'VIP Membership',
    category: 'promo',
    content: {
      subject: 'Vous êtes invité à rejoindre VIP Elite',
      preheader: 'Accès exclusif aux ventes privées',
      blocks: [
        {
          id: 'vip-text-1',
          type: 'text',
          content: { text: 'Bienvenue en VIP 👑' },
        },
        {
          id: 'vip-text-2',
          type: 'text',
          content: {
            text: "Votre fidélité vous ouvre des portes! Accédez aux ventes privées, -30% toute l'année.",
          },
        },
        {
          id: 'vip-button-1',
          type: 'button',
          content: { text: "Accepter l'invitation VIP", url: 'https://novasms.ci/vip' },
        },
      ],
    },
  },

  // === SUPPLÉMENTAIRES ===
  {
    id: 'double-optin',
    name: 'Double Opt-in',
    category: 'service',
    content: {
      subject: '{{prénom}}, confirmez votre inscription',
      preheader: 'Un clic pour activer votre compte',
      blocks: [
        {
          id: 'optin-text-1',
          type: 'text',
          content: {
            text: 'Confirmez votre adresse email',
            fontSize: 22,
            fontWeight: 700,
            textAlign: 'center',
            color: '#111827',
          },
        },
        {
          id: 'optin-divider',
          type: 'divider',
          content: { thickness: 1, color: '#e5e7eb', width: '60%' },
        },
        {
          id: 'optin-text-2',
          type: 'text',
          content: {
            text: 'Bonjour {{prénom}},\n\nCliquez sur le bouton ci-dessous pour confirmer votre inscription à {{boutique}} et activer votre compte.',
          },
        },
        {
          id: 'optin-button-1',
          type: 'button',
          content: { text: '✓ Confirmer mon email', url: 'https://novasms.ci/confirm' },
        },
        {
          id: 'optin-text-3',
          type: 'text',
          content: {
            text: "Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
            fontSize: 12,
            color: '#9ca3af',
          },
        },
      ],
    },
  },
  {
    id: 'password-reset',
    name: 'Réinitialisation Mot de Passe',
    category: 'service',
    content: {
      subject: 'Réinitialisation de votre mot de passe',
      preheader: 'Lien valable 1 heure seulement',
      blocks: [
        {
          id: 'pwd-text-1',
          type: 'text',
          content: {
            text: 'Réinitialisation de mot de passe 🔐',
            fontSize: 20,
            fontWeight: 700,
            color: '#111827',
          },
        },
        {
          id: 'pwd-text-2',
          type: 'text',
          content: {
            text: 'Bonjour {{prénom}},\n\nVous avez demandé la réinitialisation de votre mot de passe chez {{boutique}}. Cliquez sur le bouton ci-dessous pour en créer un nouveau.',
          },
        },
        {
          id: 'pwd-button-1',
          type: 'button',
          content: {
            text: 'Réinitialiser mon mot de passe',
            url: 'https://novasms.ci/reset-password',
          },
        },
        {
          id: 'pwd-divider',
          type: 'divider',
          content: { thickness: 1, color: '#e5e7eb', width: '100%' },
        },
        {
          id: 'pwd-text-3',
          type: 'text',
          content: {
            text: "Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, votre compte est sécurisé — ignorez cet email.",
            fontSize: 12,
            color: '#9ca3af',
          },
        },
      ],
    },
  },
  {
    id: 'newsletter-product-spotlight',
    name: 'Mise en Avant Produit',
    category: 'newsletter',
    content: {
      subject: '🌟 Le produit du mois chez {{boutique}}',
      preheader: 'Découvrez notre sélection exclusive',
      blocks: [
        {
          id: 'spotlight-text-1',
          type: 'text',
          content: {
            text: 'Produit du mois',
            fontSize: 11,
            fontWeight: 700,
            color: '#2ec80a',
            textAlign: 'center',
          },
        },
        {
          id: 'spotlight-text-2',
          type: 'text',
          content: {
            text: 'Notre coup de cœur du moment',
            fontSize: 24,
            fontWeight: 800,
            textAlign: 'center',
            color: '#111827',
          },
        },
        {
          id: 'spotlight-product',
          type: 'product',
          content: {
            title: 'Pack Premium NovaSMS',
            description:
              '5000 SMS + accès complet à toutes les fonctionnalités marketing. Idéal pour les PME.',
            price: '49 000 FCFA / mois',
            image: '',
            url: 'https://novasms.ci/pricing',
          },
        },
        {
          id: 'spotlight-divider',
          type: 'divider',
          content: { thickness: 1, color: '#e5e7eb', width: '100%' },
        },
        {
          id: 'spotlight-text-3',
          type: 'text',
          content: {
            text: 'Utilisez {{code_promo}} pour -15% sur votre premier mois.',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 13,
          },
        },
      ],
    },
  },
];

export function getTemplatesByCategory(category: EmailTemplate['category']) {
  return EMAIL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string) {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}
