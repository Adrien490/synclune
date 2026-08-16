import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "@playwright/test";
import { test, expect } from "./fixtures";
import { TIMEOUTS } from "./constants";

/**
 * Sécurité admin — les DEUX couches, testées séparément :
 *
 * 1. **Proxy (`proxy.ts`)** : default-deny de routes sur la simple PRÉSENCE du
 *    cookie `admin_session` — AUCUNE validation HMAC (pas de node:crypto en
 *    edge). Sans cookie → redirection `/admin/connexion?callbackURL=…`.
 * 2. **Page (`assertAdminPage()`)** : la validation RÉELLE (signature HMAC +
 *    expiry). Un cookie PRÉSENT mais falsifié/expiré PASSE le proxy
 *    (fail-open assumé, cf. proxy.ts § 4) et c'est la page qui refuse — via
 *    `unauthorized()`, qui rend `app/unauthorized.tsx` (« Connexion requise »),
 *    SANS redirection. Asserter une redirection ici serait tester un
 *    comportement qui n'existe pas.
 *
 * Les routes protégées sont DÉRIVÉES du filesystem (`app/admin/(protected)`) :
 * toute nouvelle page est couverte automatiquement, sans liste à maintenir.
 */

/** Valeur bidon pour les segments dynamiques ([slug], [id], …). */
const DUMMY_SEGMENT = "e2e-inexistant";

/**
 * Énumère les routes de `app/admin/(protected)/**\/page.tsx`.
 * Groupes de routes `(…)` ignorés, segments dynamiques remplacés par un id bidon.
 */
function deriveProtectedAdminRoutes(): string[] {
	const e2eDir = path.dirname(fileURLToPath(import.meta.url));
	const protectedDir = path.join(e2eDir, "..", "app", "admin", "(protected)");
	const routes = new Set<string>();

	const walk = (dir: string, segments: string[]) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (entry.name.startsWith("_") || entry.name === "__tests__") continue;
				const nextSegments = entry.name.startsWith("(")
					? segments
					: [...segments, entry.name.startsWith("[") ? DUMMY_SEGMENT : entry.name];
				walk(path.join(dir, entry.name), nextSegments);
			} else if (entry.name === "page.tsx") {
				routes.add("/admin" + (segments.length > 0 ? `/${segments.join("/")}` : ""));
			}
		}
	};

	walk(protectedDir, []);
	return [...routes].sort();
}

const protectedRoutes = deriveProtectedAdminRoutes();

/** Recette HMAC de `modules/admin-auth/lib/session-token.ts` — dupliquée à
 * dessein : si la recette du produit change, ce spec DOIT casser. */
function signSessionToken(expiresAtMs: number, secret: string): string {
	const payload = String(expiresAtMs);
	const hmac = createHmac("sha256", secret).update(`admin-session.v1:${payload}`).digest("hex");
	return `${payload}.${hmac}`;
}

async function newContextWithAdminCookie(browser: Browser, value: string) {
	const context = await browser.newContext();
	await context.addCookies([{ name: "admin_session", value, domain: "localhost", path: "/" }]);
	return context;
}

/** Cookie forgé : expiry lointain + signature qui n'a jamais vu AUTH_SECRET. */
const FORGED_COOKIE = `9999999999999.${"a".repeat(64)}`;

test.describe("Securite admin - Proxy (aucun cookie)", { tag: ["@critical"] }, () => {
	// Le proxy est UN matcher unique : un échantillon suffit (la couverture
	// par-page vit dans la suite « cookie forgé » ci-dessous).
	const sampleRoutes = [
		"/admin",
		"/admin/catalogue/produits",
		"/admin/catalogue/collections",
		"/admin/ventes/commandes",
		"/admin/ventes/retractations",
	];

	for (const route of sampleRoutes) {
		test(`utilisateur non authentifie → ${route} redirige vers /admin/connexion (proxy)`, async ({
			browser,
		}) => {
			const context = await browser.newContext();
			const page = await context.newPage();

			await page.goto(`http://localhost:3000${route}`);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).toHaveURL(/\/admin\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT });

			const url = page.url();
			expect(url).toContain("callbackURL");

			await context.close();
		});
	}

	test("page de connexion affichee apres redirection depuis /admin", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/connexion/);
		await expect(page.getByRole("heading", { level: 1, name: /Connexion/i })).toBeVisible();
	});
});

test.describe("Securite admin - Cookie forgé (garde par PAGE)", { tag: ["@critical"] }, () => {
	// La validation HMAC est PAR PAGE (`assertAdminPage()` — un layout partagé
	// n'est pas ré-exécuté en navigation client) : chaque page doit être testée.
	// Une seule fois suffit (le guard ne dépend pas du navigateur) : chromium.
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Garde serveur par page — indépendante du navigateur",
	);

	for (const route of protectedRoutes) {
		test(`cookie forgé → ${route} rend « Connexion requise » (assertAdminPage)`, async ({
			browser,
		}) => {
			const context = await newContextWithAdminCookie(browser, FORGED_COOKIE);
			const page = await context.newPage();

			try {
				await page.goto(route);
				// Fail-open du proxy assumé : la requête atteint la page, qui rend le
				// 401 `app/unauthorized.tsx` (streaming PPR ⇒ on asserte le CONTENU).
				await expect(page.getByRole("heading", { name: /Connexion requise/i })).toBeVisible({
					timeout: TIMEOUTS.AUTH_REDIRECT,
				});
				await expect(page.getByRole("link", { name: /Se connecter/i })).toBeVisible();
			} finally {
				await context.close();
			}
		});
	}
});

test.describe("Securite admin - Cookies invalides (variantes)", { tag: ["@critical"] }, () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Garde serveur — indépendante du navigateur",
	);
	test.skip(!process.env.AUTH_SECRET, "AUTH_SECRET requis pour signer les cookies de test");

	test("cookie EXPIRÉ mais correctement signé → « Connexion requise »", async ({ browser }) => {
		// Signature valide, expiry dans le passé : seul `verifySessionToken`
		// (expiry APRÈS vérification de signature) peut le refuser.
		const expired = signSessionToken(Date.now() - 60 * 60 * 1000, process.env.AUTH_SECRET!);
		const context = await newContextWithAdminCookie(browser, expired);
		const page = await context.newPage();

		try {
			await page.goto("/admin");
			await expect(page.getByRole("heading", { name: /Connexion requise/i })).toBeVisible({
				timeout: TIMEOUTS.AUTH_REDIRECT,
			});
		} finally {
			await context.close();
		}
	});

	test("signature VALIDE mais transplantée sur un autre expiry → « Connexion requise »", async ({
		browser,
	}) => {
		// Tampering réel : on prend le HMAC d'un token expiré et on le colle sur
		// un expiry futur — la signature est authentique, mais pas pour CE payload.
		const secret = process.env.AUTH_SECRET!;
		const authenticHmac = signSessionToken(Date.now() - 1000, secret).split(".")[1];
		const tampered = `9999999999999.${authenticHmac}`;

		const context = await newContextWithAdminCookie(browser, tampered);
		const page = await context.newPage();

		try {
			await page.goto("/admin");
			await expect(page.getByRole("heading", { name: /Connexion requise/i })).toBeVisible({
				timeout: TIMEOUTS.AUTH_REDIRECT,
			});
		} finally {
			await context.close();
		}
	});
});

test.describe("Securite admin - API routes", { tag: ["@critical"] }, () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Garde serveur — indépendante du navigateur",
	);

	test("POST /api/admin/orders/export avec cookie forgé → 401", async ({ browser }) => {
		const context = await newContextWithAdminCookie(browser, FORGED_COOKIE);
		try {
			const response = await context.request.post("http://localhost:3000/api/admin/orders/export");
			expect([401, 403]).toContain(response.status());
		} finally {
			await context.close();
		}
	});

	test("POST /api/admin/orders/export avec cookie expiré signé → 401", async ({ browser }) => {
		test.skip(!process.env.AUTH_SECRET, "AUTH_SECRET requis");
		const expired = signSessionToken(Date.now() - 60 * 60 * 1000, process.env.AUTH_SECRET!);
		const context = await newContextWithAdminCookie(browser, expired);
		try {
			const response = await context.request.post("http://localhost:3000/api/admin/orders/export");
			expect([401, 403]).toContain(response.status());
		} finally {
			await context.close();
		}
	});
});
