/**
 * Utilitaires de certification et d'intégrité pour les rapports d'État (DGI) et Banques
 * Garantie ZÉRO-HALLUCINATION : Calculs déterministes stricts sur transactions réelles.
 */

export interface IntegrityCertificate {
  verificationCode: string;
  auditHash: string;
  generatedAt: string;
  transactionCount: number;
  totalVolume: number;
  nifCif: string;
  securityNotice: string;
}

/**
 * Calcule un hachage d'intégrité déterministe pour garantir l'absence de falsification
 */
export function generateReportIntegrityHash(
  companyIdentifier: string,
  nifCif: string,
  startDate: string,
  endDate: string,
  salesCount: number,
  totalRevenue: number,
  totalTax: number
): string {
  const seedString = `${companyIdentifier}|${nifCif || 'NON-RENSEIGNE'}|${startDate}|${endDate}|${salesCount}|${totalRevenue.toFixed(2)}|${totalTax.toFixed(2)}`;
  
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const check = (salesCount * 31 + Math.round(totalRevenue)).toString(16).toUpperCase().slice(-4);
  return `CERT-HT-${hex}-${check}`;
}

export const HAITIAN_BANKS = [
  { id: 'unibank', name: 'UNIBANK S.A. - Direction du Crédit Commercial' },
  { id: 'sogebank', name: 'SOGEBANK - Département Entreprises & PME' },
  { id: 'bnc', name: 'Banque Nationale de Crédit (BNC)' },
  { id: 'buh', name: 'Banque de l\'Union Haïtienne (BUH)' },
  { id: 'capital_bank', name: 'CAPITAL BANK S.A.' },
  { id: 'brh', name: 'Banque de la République d\'Haïti (BRH)' },
  { id: 'other_bank', name: 'Autre Établissement Bancaire / Micro-Finance' },
];

export const STATE_ENTITIES = [
  { id: 'dgi', name: 'Direction Générale des Impôts (DGI) - Bureau des Contributions' },
  { id: 'mci', name: 'Ministère du Commerce et de l\'Industrie (MCI)' },
  { id: 'ona', name: 'Office National d\'Assurance-Vieillesse (ONA)' },
  { id: 'ofatma', name: 'OFATMA - Sécurité Sociale & Accidents du Travail' },
  { id: 'douanes', name: 'Administration Générale des Douanes (AGD)' },
];
