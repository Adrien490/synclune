/**
 * @regression image-optimizer-no-multitenant-host
 *
 * Audit coûts P1-1 — `images.remotePatterns` est la frontière de facturation de
 * l'optimiseur d'images Vercel. Chaque hôte autorisé permet à N'IMPORTE QUI
 * d'appeler `/_next/image?url=<hôte>/…&w=…&q=…` et de faire facturer une
 * transformation, sans rate limit (la route est exclue du matcher de
 * `proxy.ts`).
 *
 * Le wildcard `*.ufs.sh` rendait le nombre de sources NON BORNÉ : le domaine
 * est multi-tenant (`<appId>.ufs.sh` par client UploadThing), donc un attaquant
 * disposant d'un compte gratuit pouvait faire transformer ses propres fichiers
 * par le compte Vercel de Synclune, à raison de
 * 15 largeurs × 2 qualités × 2 formats = 60 transformations par image uploadée.
 *
 * Ce test échoue dès qu'un hôte à wildcard réapparaît dans `remotePatterns`, ou
 * qu'un hôte `ufs.sh` cesse de correspondre à un app-id du compte Synclune.
 */
import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";
import { UPLOADTHING_APP_IDS, UPLOADTHING_CDN_HOSTS } from "../uploadthing";

/**
 * Hôtes multi-tenants tolérés en l'état, avec leur justification.
 *
 * `utfs.io` est l'hôte legacy v6 : global à tous les tenants UploadThing et
 * non scopable par app-id. Conservé tant que des lignes média antérieures à la
 * migration `<appId>.ufs.sh` le référencent. À retirer de `remotePatterns`
 * (et d'ici) une fois la base confirmée propre.
 */
const ACCEPTED_SHARED_HOSTS = new Set(["utfs.io"]);

const remotePatterns = nextConfig.images?.remotePatterns ?? [];

describe("images.remotePatterns", () => {
	it("n'autorise aucun hostname à wildcard", () => {
		const wildcards = remotePatterns
			.map((pattern) => pattern.hostname)
			.filter((hostname) => hostname.includes("*"));

		expect(
			wildcards,
			"Un wildcard rend le nombre de sources transformables non borné — épingler l'hôte exact.",
		).toEqual([]);
	});

	it("n'autorise que des hôtes ufs.sh appartenant au compte Synclune", () => {
		const allowedUfsHosts = UPLOADTHING_APP_IDS.map((appId) => `${appId}.ufs.sh`);

		const ufsHosts = remotePatterns
			.map((pattern) => pattern.hostname)
			.filter((hostname) => hostname.endsWith(".ufs.sh"));

		expect(ufsHosts.length).toBeGreaterThan(0);
		for (const hostname of ufsHosts) {
			expect(allowedUfsHosts).toContain(hostname);
		}
	});

	it("borne chaque hôte par un préfixe de chemin (jamais /**)", () => {
		for (const pattern of remotePatterns) {
			// Unsplash n'est autorisé qu'en dev (seed) : hors périmètre de facturation prod.
			if (pattern.hostname === "images.unsplash.com") continue;

			expect(pattern.pathname, `${pattern.hostname} doit borner son pathname`).toBe("/f/**");
		}
	});

	it("garde les hôtes partagés restants dans une liste explicitement justifiée", () => {
		const sharedHosts = remotePatterns
			.map((pattern) => pattern.hostname)
			.filter((hostname) => !hostname.endsWith(".ufs.sh") && hostname !== "images.unsplash.com");

		for (const hostname of sharedHosts) {
			expect(
				ACCEPTED_SHARED_HOSTS.has(hostname),
				`${hostname} est un hôte partagé non justifié — l'épingler ou documenter le résidu.`,
			).toBe(true);
		}
	});

	it("garde le preconnect aligné sur les hôtes réellement optimisables", () => {
		// Un host preconnecté mais absent de remotePatterns = handshake gaspillé ;
		// l'inverse = image LCP servie sans preconnect.
		const optimizableUfsOrigins = remotePatterns
			.map((pattern) => pattern.hostname)
			.filter((hostname) => hostname.endsWith(".ufs.sh"))
			.map((hostname) => `https://${hostname}`);

		expect([...UPLOADTHING_CDN_HOSTS].sort()).toEqual(optimizableUfsOrigins.sort());
	});
});
