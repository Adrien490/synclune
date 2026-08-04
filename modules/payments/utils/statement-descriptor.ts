/**
 * Suffixe de libellé de relevé bancaire, dérivé du numéro de commande.
 *
 * ## Pourquoi
 *
 * Le libellé de relevé est ce que la cliente lit sur son extrait de compte, et
 * « je ne reconnais pas ce débit » est le motif de contestation le plus courant.
 * Un libellé qui porte le numéro de commande se rapproche du seul identifiant
 * qu'elle possède déjà — celui de son e-mail de confirmation.
 *
 * ## Les trois règles, toutes issues de `docs/stripe/01-payments.md`
 *
 *  1. **22 caractères** pour l'ENSEMBLE préfixe + séparateur + suffixe. Stripe
 *     ajoute lui-même `* ` entre les deux et **tronque** le résultat — il ne
 *     rejette pas (`01-payments.md:8215` : « the concatenation of both prefix and
 *     suffix (including separators) will appear truncated to 22 characters »).
 *     C'est ce qui rend ce champ sûr à poser sans connaître le préfixe du compte :
 *     le pire cas est un numéro coupé, pas un paiement refusé.
 *  2. **Caractères interdits** : `<`, `>`, `'`, `"`, `*` (`:207`).
 *  3. **Jamais uniquement des chiffres** (`:207`). ⚠️ C'est la règle qui interdit
 *     l'optimisation tentante « ne garder que la partie numérique du numéro de
 *     commande pour économiser des caractères » : `SYN-042` → `042` serait REJETÉ.
 *     Le préfixe alphabétique n'est pas du remplissage, il rend le suffixe valide.
 *
 * ⚠️ À poser sur `statement_descriptor_suffix` et **jamais** sur
 * `statement_descriptor` : ce dernier « renvoie une erreur » sur une charge carte
 * (`01-payments.md:9464`), et le tunnel est card-only.
 */

/** Plafond réseau du libellé complet. Le suffixe seul ne peut pas le dépasser. */
const STATEMENT_DESCRIPTOR_MAX_LENGTH = 22;

/** `<`, `>`, `'`, `"`, `*` — rejetés par Stripe. */
const FORBIDDEN_CHARS = /[<>'"*]/g;

export function buildStatementDescriptorSuffix(orderNumber: string): string {
	const cleaned = orderNumber
		.replace(FORBIDDEN_CHARS, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, STATEMENT_DESCRIPTOR_MAX_LENGTH);

	// Repli : un numéro qui, une fois nettoyé, serait vide ou entièrement
	// numérique ferait rejeter la requête. On préfère un libellé générique mais
	// valide à un checkout cassé.
	if (!cleaned || !/[a-zA-Z]/.test(cleaned)) return "COMMANDE";

	return cleaned;
}
