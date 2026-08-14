import { test as setup } from "@playwright/test";

/**
 * ⚠️ NEUTRALISÉ au lot 1 de la migration lean (docs/MIGRATION-PROMPTS.md) —
 * Better Auth est parti, l'auth admin est un cookie HMAC posé par
 * `/admin/connexion`. Ce setup écrivait l'état de session Better Auth dans
 * `e2e/.auth/admin.json` pour le projet `authenticated`.
 *
 * Les e2e sont ROUGES ASSUMÉS jusqu'au lot 7, qui refond toute la suite.
 * On écrit ici un storage state VIDE pour que les projets dépendants
 * démarrent sans crash de fichier manquant — leurs tests échouent ensuite
 * normalement, ce qui est l'état attendu.
 */
setup("authenticate as admin (neutralisé — lot 7)", async ({ page }) => {
	await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
