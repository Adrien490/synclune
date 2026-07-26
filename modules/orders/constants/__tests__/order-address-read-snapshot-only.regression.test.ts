import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { GET_LAST_ORDER_DEFAULT_SELECT } from "../last-order.constants";
import {
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
	GET_ORDERS_SELECT,
} from "../order.constants";
import { GET_USER_ORDERS_SELECT } from "../user-orders.constants";

/**
 * @regression order-address-read-snapshot-only-2026-07-02
 *
 * Pendant read-side de l'invariant #5 (snapshots adresses figés sur Order,
 * cf. CLAUDE.md § "Facturation électronique — invariants" et
 * `order-address-snapshot-immutability.regression.test.ts` qui verrouille le
 * côté ÉCRITURE) : l'affichage d'une commande — pages client/admin, emails,
 * PDF facture — repose exclusivement sur les colonnes snapshot
 * `Order.shipping*` / `Order.billing*`, jamais sur le modèle `Address` live.
 *
 * Risque si la garde saute : un lecteur `prisma.address` (ou un join
 * `user.addresses`) branché sur un affichage commande montrerait l'adresse
 * COURANTE du client sur une commande historique — divergence avec la facture
 * archivée (Art. L102 B LPF) dès que le client modifie ou supprime son adresse.
 *
 * Deux gardes complémentaires :
 *  1. Scan statique : `prisma.address.*` / `tx.address.*` n'apparaît que dans
 *     l'allowlist (module addresses + anonymisation RGPD). Le schéma n'a
 *     aucune FK Order→Address, donc tout accès à l'adresse live depuis un flux
 *     commande passerait forcément par un de ces appels directs.
 *  2. Introspection des sélecteurs d'affichage : pas de join `addresses` via
 *     la relation user, et les colonnes snapshot restent exposées.
 */

const REPO_ROOT = process.cwd();

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walkTs(full, out);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".d.ts") &&
			!full.includes("/__tests__/") &&
			!full.includes("/__mocks__/")
		) {
			out.push(full);
		}
	}
	return out;
}

const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
].filter((f) => !f.includes("/app/generated/"));

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

describe("Adresses commande — lecture snapshot uniquement (Invariant #5, read-side)", () => {
	it("only allowlisted files access the live Address model (prisma/tx.address.*)", () => {
		const readers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return /\b(?:prisma|tx)\.address\./.test(stripped);
			})
			.map(relPath)
			.sort();

		// Allowlist documentée — seuls usages légitimes du modèle Address live :
		//  - modules/addresses/** : CRUD du carnet d'adresses du compte client
		//    (aucun de ces fichiers ne touche Order — vérifié par le test
		//    write-side order-address-snapshot-immutability).
		//  - anonymize-user.service.ts : deleteMany RGPD (droit à l'oubli) —
		//    supprime le carnet, les snapshots Order restent intacts.
		const allowed = [
			"modules/addresses/actions/delete-address.ts",
			"modules/addresses/actions/set-default-address.ts",
			"modules/addresses/actions/update-address.ts",
			"modules/addresses/data/get-user-addresses.ts",
			"modules/addresses/services/save-address.service.ts",
			"modules/users/services/anonymize-user.service.ts",
		].sort();

		expect(readers).toEqual(allowed);
	});

	const DISPLAY_SELECTS = {
		GET_ORDERS_SELECT,
		GET_ORDER_SELECT_ADMIN,
		GET_ORDER_SELECT_CUSTOMER,
		GET_USER_ORDERS_SELECT,
		GET_LAST_ORDER_DEFAULT_SELECT,
	} as const;

	function findAddressJoins(node: unknown, path: string, offenders: string[]): void {
		if (node === null || typeof node !== "object") return;
		for (const [key, value] of Object.entries(node)) {
			const childPath = `${path}.${key}`;
			// Pas de FK Order→Address : le seul join possible passe par la
			// relation `user.addresses`.
			if (key === "addresses" || key === "address") {
				offenders.push(childPath);
			}
			findAddressJoins(value, childPath, offenders);
		}
	}

	for (const [name, select] of Object.entries(DISPLAY_SELECTS)) {
		it(`${name} ne joint pas le carnet d'adresses live (user.addresses)`, () => {
			const offenders: string[] = [];
			findAddressJoins(select, name, offenders);
			expect(offenders).toEqual([]);
		});
	}

	it("les sélecteurs de détail exposent bien les colonnes adresse snapshot", () => {
		// Garde-fou complémentaire : si quelqu'un remplace les colonnes snapshot
		// par un join (échappant au test ci-dessus via un renommage), l'absence
		// des colonnes le signale.
		for (const select of [GET_ORDER_SELECT_ADMIN, GET_ORDER_SELECT_CUSTOMER]) {
			expect(select).toMatchObject({
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
				shippingPhone: true,
				billingSameAsShipping: true,
				billingFirstName: true,
				billingAddress1: true,
				billingPostalCode: true,
				billingCity: true,
			});
		}
	});
});
