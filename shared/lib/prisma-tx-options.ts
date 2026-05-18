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
