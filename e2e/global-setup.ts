/**
 * Global setup : fige TEST_RUN_ID pour TOUT le run, workers compris.
 *
 * ⚠️ Cause racine de deux tests morts (audit e2e 2026-08-16) : `TEST_RUN_ID`
 * était `Date.now()` évalué à l'import — donc PAR PROCESSUS WORKER avec
 * `fullyParallel: true`. Un test qui cherchait en page une donnée créée par un
 * autre worker via `hasText: TEST_RUN_ID` ne la trouvait jamais (autre ID) et
 * skippait pour toujours (suppression produit, suppression collection).
 *
 * Le setup tourne dans le processus principal AVANT le spawn des workers ;
 * ceux-ci héritent de `process.env`, donc tous lisent le même ID.
 */
function globalSetup() {
	process.env.E2E_TEST_RUN_ID ??= `e2e-${Date.now()}`;
}

export default globalSetup;
