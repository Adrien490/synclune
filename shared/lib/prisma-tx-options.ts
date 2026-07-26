/**
 * Timeouts $transaction Prisma (defaults: 5s timeout, 2s maxWait).
 * Utiliser TX_TIMEOUT_LONG pour bulk operations, locks FOR UPDATE,
 * ou tx dépendant d'I/O externes (Stripe, etc.).
 *
 * Module séparé de `shared/lib/prisma.ts` pour éviter que les 368 tests
 * mockant `@/shared/lib/prisma` aient à redéclarer ces constantes.
 *
 * @example
 * import { prisma } from "@/shared/lib/prisma";
 * import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
 * await prisma.$transaction(async (tx) => { ... }, {
 *   timeout: TX_TIMEOUT_LONG,
 *   maxWait: TX_MAX_WAIT_LONG,
 * });
 */
export const TX_TIMEOUT_LONG = 30_000;
export const TX_MAX_WAIT_LONG = 10_000;

/**
 * Codes d'erreur Prisma TRANSITOIRES, sûrs à retenter pour les transactions de
 * séquence facturation (persist-invoice-number / void-invoice /
 * issue-credit-note) dont la garde d'idempotence est re-vérifiée SOUS advisory
 * lock à chaque tentative (EINV-SEQ-006 — un retry ne peut ni dupliquer ni
 * écraser un numéro déjà émis) :
 * - P2002 : violation unique — race cross-instance résiduelle.
 * - P2024 : timeout d'acquisition de connexion pool (maxWait) — la tx n'a
 *   jamais démarré, rien n'a été écrit.
 * - P2028 : timeout de la transaction interactive (rollback complet) — arrive
 *   sous burst quand l'attente sur `pg_advisory_xact_lock` consomme le budget.
 *
 * Les échecs métier (BusinessError overflow) ne doivent JAMAIS être retentés :
 * ils ne matchent pas `PrismaClientKnownRequestError`.
 */
export const RETRYABLE_SEQUENCE_TX_ERROR_CODES: ReadonlySet<string> = new Set([
	"P2002",
	"P2024",
	"P2028",
]);
