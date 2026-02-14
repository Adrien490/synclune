/**
 * Versions des documents légaux
 * Incrémenter ces valeurs lorsque les documents sont mis à jour
 * Format: YYYY-MM (année-mois de la dernière mise à jour significative)
 *
 * Ces versions sont enregistrées avec le consentement de l'utilisateur
 * pour prouver quelle version des CGV/politique de confidentialité a été acceptée.
 */
export const LEGAL_VERSIONS = {
  /** Version des Conditions Générales de Vente */
  TERMS: "2026-02",
  /** Version de la Politique de Confidentialité */
  PRIVACY_POLICY: "2026-02",
} as const;

export type LegalVersions = typeof LEGAL_VERSIONS;
