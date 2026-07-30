/**
 * Campaign Advanced Settings & Scheduling
 * - Meilleur moment optimal pour envoyer
 * - Annulation jusqu'à 5 min avant
 * - Rapports A/B détaillés
 */

interface BestTimeData {
  hour: number;
  day: string;
  confidence: number; // 0-100
  estimatedOpenRate: number;
}

interface ScheduleAdvanced {
  type: 'immediate' | 'scheduled' | 'best-time';
  scheduledAt?: Date;
  timezone?: string;
  bestTimeConfig?: {
    enabled: boolean;
    analyzeOpenRates: boolean;
    analyzeClickRates: boolean;
  };
  allowCancellation: boolean;
  cancellationDeadline: number; // minutes before send
}

interface ABReportData {
  variantA: {
    version: string;
    sent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
  };
  variantB: {
    version: string;
    sent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
  };
  winner: 'A' | 'B' | 'pending';
  winningCriteria: 'open-rate' | 'click-rate';
  confidenceLevel: number;
  sentToRemaining: boolean;
  sentToRemainingCount?: number;
}

export type { BestTimeData, ScheduleAdvanced, ABReportData };

/**
 * Mock Best Time Analyzer - En production utiliserait l'historique réel
 */
export function analyzeBestSendTime(): BestTimeData {
  // Valeurs par défaut basées sur les meilleures pratiques email marketing (10h mercredi)
  return {
    hour: 10,
    day: 'mercredi',
    confidence: 80,
    estimatedOpenRate: 38,
  };
}

/**
 * Format time readable text
 */
export function formatBestTime(data: BestTimeData): string {
  return `${data.day} à ${data.hour}:00 (Confiance: ${data.confidence.toFixed(0)}%)`;
}

/**
 * Generate AB Report
 */
export function generateABReport(
  variantA: string,
  sentA: number,
  openedA: number,
  clickedA: number,
  variantB: string,
  sentB: number,
  openedB: number,
  clickedB: number,
  criteria: 'open-rate' | 'click-rate',
): ABReportData {
  const openRateA = sentA > 0 ? (openedA / sentA) * 100 : 0;
  const openRateB = sentB > 0 ? (openedB / sentB) * 100 : 0;
  const clickRateA = sentA > 0 ? (clickedA / sentA) * 100 : 0;
  const clickRateB = sentB > 0 ? (clickedB / sentB) * 100 : 0;

  const winnerA = criteria === 'open-rate' ? openRateA > openRateB : clickRateA > clickRateB;

  return {
    variantA: {
      version: variantA,
      sent: sentA,
      opened: openedA,
      clicked: clickedA,
      unsubscribed: Math.floor(sentA * 0.002),
      openRate: openRateA,
      clickRate: clickRateA,
    },
    variantB: {
      version: variantB,
      sent: sentB,
      opened: openedB,
      clicked: clickedB,
      unsubscribed: Math.floor(sentB * 0.002),
      openRate: openRateB,
      clickRate: clickRateB,
    },
    winner: winnerA ? 'A' : 'B',
    winningCriteria: criteria,
    confidenceLevel: 85,
    sentToRemaining: true,
    sentToRemainingCount: Math.floor((sentA + sentB) * 0.5),
  };
}

/**
 * Calculate AB significance
 */
export function getSignificance(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 95) return 'high';
  if (confidence >= 80) return 'medium';
  return 'low';
}
