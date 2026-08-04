/**
 * @regression ord-test-029 — OrderAction enum coverage
 *
 * Garde-fou : chaque valeur de l'enum `OrderAction` (audit trail Art. L123-22)
 * DOIT avoir au moins un créateur (call-site `OrderAction.<VALUE>`) dans le
 * code applicatif. Sinon : valeur enum orpheline → bug silencieux (transition
 * métier identifiée par la valeur ne sera jamais auditée).
 *
 * Stratégie : parse l'enum dans schema.prisma puis `git grep` exhaustif des
 * call-sites `OrderAction.<VALUE>` (1 commande, rapide). Toute valeur sans
 * call-site fait casser le test.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

function extractEnumValues(enumName: string): string[] {
	const schema = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");
	const match = schema.match(new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
	if (!match) throw new Error(`Enum ${enumName} not found in schema.prisma`);
	const body = match[1] ?? "";
	return body
		.split("\n")
		.map((line) => line.replace(/\/\/.*$/, "").trim())
		.filter((line) => line.length > 0 && /^[A-Z_][A-Z0-9_]*$/.test(line));
}

/**
 * Compte les call-sites pour chaque valeur de l'enum dans modules/, app/, shared/.
 *
 * Synclune utilise deux styles :
 *   1. `OrderAction.VALUE`           — référence typée explicite
 *   2. `action: "VALUE"`             — string literal typé par TypeScript
 *      (la prop `action` du helper `createOrderAuditTx` est typée `OrderAction`)
 *
 * Pour éviter les faux positifs (les valeurs partagées avec OrderStatus /
 * PaymentStatus comme SHIPPED, PROCESSING, DELIVERED…), on n'accepte le style #2
 * que dans des fichiers qui IMPORTENT `OrderAction` ou `createOrderAudit*`
 * (signal fort que le `action:` proche est typé).
 *
 * ⚠️ Le style #2 doit accepter le TERNAIRE. Le motif exigeait le littéral collé
 * (`action:\s*"VALUE"`), donc `action: x === "shipping" ? "SHIPPED" : "CREATED"`
 * (`resend-order-email.ts`) était invisible : `CREATED` a été whitelisté comme
 * orphelin alors qu'il avait un écrivain, et le garde-fou « whitelist sanity »
 * était aveugle pour la même raison. On scanne donc TOUTES les valeurs citées sur
 * une ligne portant `action:`, et non la première collée au `:`.
 */
function findCallSites(enumName: string, values: string[]): Map<string, string[]> {
	const sites = new Map<string, string[]>();
	for (const v of values) sites.set(v, []);

	const valuesAlt = values.join("|");

	// Pass 1 : référence typée `OrderAction.VALUE` (sans ambiguïté).
	const typedPattern = `\\b${enumName}\\.(${valuesAlt})\\b`;
	let typedRaw = "";
	try {
		typedRaw = execSync(`git grep -Pn -- '${typedPattern}' modules app shared`, {
			cwd: REPO_ROOT,
			encoding: "utf-8",
			maxBuffer: 16 * 1024 * 1024,
		});
	} catch {
		typedRaw = "";
	}

	// Pass 2 : string literal `action: "VALUE"` — uniquement dans les
	// fichiers qui importent OrderAction ou createOrderAudit* (heuristique).
	// Codebase Synclune n'utilise QUE les doubles guillemets pour ces littéraux
	// (`pnpm format` enforce). Pas de single quote dans la regex pour éviter
	// les conflits d'échappement shell.
	const literalPattern = `action:.*"(${valuesAlt})"`;
	let literalRaw = "";
	try {
		literalRaw = execSync(`git grep -Pn -- '${literalPattern}' modules app shared`, {
			cwd: REPO_ROOT,
			encoding: "utf-8",
			maxBuffer: 16 * 1024 * 1024,
		});
	} catch {
		literalRaw = "";
	}

	const raw = `${typedRaw}\n${literalRaw}`;

	const EXCLUDED_SUFFIXES = [
		".test.ts",
		".test.tsx",
		".regression.test.ts",
		".regression.test.tsx",
		".integration.test.ts",
		".integration.test.tsx",
		".contract.test.ts",
	];
	const EXCLUDED_PATH_PARTS = [
		"__tests__/",
		"__mocks__/",
		"app/generated/", // Prisma client TS
		"fixtures/",
	];

	// Cache des fichiers déjà vérifiés "contient OrderAction OR createOrderAudit"
	const auditFileCache = new Map<string, boolean>();
	function isAuditAwareFile(filePath: string): boolean {
		const cached = auditFileCache.get(filePath);
		if (cached !== undefined) return cached;
		try {
			const source = readFileSync(join(REPO_ROOT, filePath), "utf-8");
			const result =
				source.includes("OrderAction") ||
				source.includes("createOrderAudit") ||
				source.includes("orderHistory");
			auditFileCache.set(filePath, result);
			return result;
		} catch {
			auditFileCache.set(filePath, false);
			return false;
		}
	}

	for (const line of raw.split("\n")) {
		if (!line) continue;
		// Format : <file>:<lineNo>:<content>
		const firstColon = line.indexOf(":");
		if (firstColon < 0) continue;
		const filePath = line.slice(0, firstColon);
		if (EXCLUDED_SUFFIXES.some((s) => filePath.endsWith(s))) continue;
		if (EXCLUDED_PATH_PARTS.some((p) => filePath.includes(p))) continue;
		if (filePath.endsWith("factories.ts")) continue;

		const content = line.slice(firstColon + 1);

		// Style 1 : référence typée `OrderAction.VALUE`
		const typedMatch = content.match(new RegExp(`\\b${enumName}\\.([A-Z_][A-Z0-9_]*)\\b`));
		if (typedMatch) {
			const value = typedMatch[1]!;
			const arr = sites.get(value);
			if (arr && !arr.includes(filePath)) arr.push(filePath);
			continue;
		}

		// Style 2 : string literal sur une ligne `action:` — uniquement dans un
		// fichier audit-aware. On prend TOUTES les valeurs citées sur la ligne (un
		// ternaire en porte deux), pas seulement celle collée au `:`.
		if (content.includes("action:") && isAuditAwareFile(filePath)) {
			for (const m of content.matchAll(/"([A-Z_][A-Z0-9_]*)"/g)) {
				const value = m[1]!;
				const arr = sites.get(value);
				if (arr && !arr.includes(filePath)) arr.push(filePath);
			}
		}
	}
	return sites;
}

/**
 * Whitelist explicite — valeurs enum sans call-site applicatif aujourd'hui,
 * mais documentées comme acceptables. Toute addition demande un comment
 * justifiant la raison + un horizon de levée.
 */
const KNOWN_ORPHANS = new Map<string, string>([
	// `CREATED` a été RETIRÉ de cette whitelist (audit V2, Lot 4) : il n'a jamais
	// été orphelin. `resend-order-email.ts` l'écrit — via un ternaire, que le
	// détecteur ne savait pas lire (cf. l'avertissement sur `findCallSites`). La
	// whitelist affirmait donc un gap inexistant, et le garde-fou « whitelist
	// sanity » ne pouvait pas la contredire puisqu'il s'appuie sur le même
	// détecteur. Ne pas la réintroduire sans vérifier le call-site à la main.
	//
	// Les 6 valeurs PDP_* (transmission B2B/B2G, inertes depuis le recentrage B2C
	// 2026-05-28) ont été purgées de l'enum au Lot 0 (migration 20260803,
	// SIMPLIFICATION.md S2.1) — plus rien à whitelister ici.
]);

describe("@regression ord-test-029 — OrderAction enum coverage", () => {
	const enumName = "OrderAction";
	const values = extractEnumValues(enumName);
	const sites = findCallSites(enumName, values);

	// Plancher 25 → 20 le 2026-08-05 : `OrderHistory` est recentré sur les
	// TRANSITIONS. Les 6 valeurs de plomberie facture retirées (INVOICE_ARCHIVED,
	// CREDIT_NOTE_ARCHIVED, PDF_ARCHIVE_FAILED, CREDIT_NOTE_FAILED,
	// INVOICE_GENERATION_FAILED, INVOICE_RECONCILED) redisaient un état DÉRIVABLE
	// des colonnes (`invoicePdfUrl`, `creditNotePdfUrl`, `invoiceRetryDeferred`),
	// et l'alerte réelle — e-mail admin + Sentry — ne passait pas par elles.
	// ⚠️ Ce plancher garde son rôle : il empêche que l'enum se vide par dérive.
	it("schema.prisma exposes at least 20 OrderAction values (audit trail breadth)", () => {
		expect(values.length).toBeGreaterThanOrEqual(20);
	});

	describe("each OrderAction value has at least one application call-site", () => {
		for (const value of values) {
			const reason = KNOWN_ORPHANS.get(value);
			if (reason) {
				it.skip(`OrderAction.${value} (whitelisted orphan : ${reason})`, () => {});
				continue;
			}
			it(`OrderAction.${value} is referenced somewhere outside tests`, () => {
				const callers = sites.get(value) ?? [];
				expect(
					callers.length,
					`OrderAction.${value} has 0 call-sites in modules/ app/ shared/ (excluding tests). ` +
						`Either remove the orphan enum value from schema.prisma OR wire it to a producer ` +
						`OR add it to KNOWN_ORPHANS with justification.`,
				).toBeGreaterThan(0);
			});
		}
	});

	it("whitelist sanity — every KNOWN_ORPHANS entry is actually orphan today", () => {
		// Si un orphan whitelisté gagne un call-site (ex: PDP_RETRY câblé), on
		// veut forcer le retrait de la whitelist pour resserrer le contrat.
		const unjustified: string[] = [];
		for (const value of KNOWN_ORPHANS.keys()) {
			const callers = sites.get(value) ?? [];
			if (callers.length > 0) {
				unjustified.push(
					`OrderAction.${value} is whitelisted but has ${callers.length} call-site(s) — ` +
						`remove from KNOWN_ORPHANS.`,
				);
			}
		}
		expect(unjustified, unjustified.join("\n")).toEqual([]);
	});

	it("call-site map snapshot for review on drift", () => {
		const summary = Object.fromEntries(values.map((v) => [v, (sites.get(v) ?? []).sort()]));
		expect(summary).toMatchSnapshot();
	});
});
