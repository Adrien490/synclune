/**
 * Version courante des documents contractuels acceptés à l'inscription
 * (CGV `/cgv` + politique de confidentialité `/confidentialite`).
 *
 * SSOT persisté dans `User.termsVersion` à chaque acceptation (inscription
 * email + bandeau OAuth) — accountability Art. 7 RGPD : prouver QUELLE version
 * a été acceptée, pas seulement quand.
 *
 * ⚠️ Incrémenter (date de publication `YYYY-MM-DD`) à CHAQUE révision des CGV
 * ou de la politique de confidentialité. Ne jamais réutiliser une valeur.
 * Distinct de `CURRENT_POLICY_VERSION` (cookie-consent-store) qui ne couvre
 * que la politique cookies.
 */
export const LEGAL_TERMS_VERSION = "2026-07-06";
