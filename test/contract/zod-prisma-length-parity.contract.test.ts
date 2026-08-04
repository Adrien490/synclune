/**
 * @regression zod-prisma-length-parity
 *
 * Parité entre la borne `.max()` d'un champ Zod et la largeur de la colonne
 * Postgres où sa valeur atterrit.
 *
 * ⚠️ Ce contrat traite une CLASSE de défaut, pas des instances. L'audit « Validation
 * Zod » du 2026-07-31 en a trouvé six d'un coup, tous avec le même scénario : Zod
 * accepte, l'utilisateur croit sa saisie valide, puis Postgres lève un `22001`
 * (`value too long for type character varying(n)`) **à l'intérieur** de la
 * transaction — rendu à l'écran en « Une erreur est survenue », sans indication du
 * champ fautif. Les plus faciles à déclencher :
 *
 *  - `trackingNumber` borné à 100 pour une colonne `VarChar(50)` : un numéro de suivi
 *    collé depuis un back-office transporteur faisait échouer « Marquer comme
 *    expédiée » ;
 *  - `fullName` borné à 101 (50 + espace + 50) alors qu'il est recomposé dans
 *    `Order.customerName VarChar(100)` ;
 *  - `emailSchema` et `phoneSchema` sans aucune borne — `z.email()` valide le format,
 *    jamais la longueur.
 *
 * Ni `tsc` ni les tests d'intégration ne voient ce trou : le type TypeScript d'une
 * colonne `VarChar(n)` est `string`, et `db push` accepte n'importe quelle longueur
 * tant qu'aucune ligne trop longue n'est écrite.
 *
 * ── Ajouter une paire ────────────────────────────────────────────────────────────
 * Toute nouvelle string Zod dont la valeur est persistée dans une colonne
 * `@db.VarChar(n)` doit être déclarée dans `PAIRS`. La déclaration est explicite (et
 * non déduite) parce qu'il n'existe aucun lien mécanique entre un champ de schéma et
 * une colonne : les noms diffèrent (`fullName` → `customerName`), un champ peut
 * alimenter plusieurs colonnes, et certaines valeurs sont recomposées avant l'INSERT.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { emailOptionalSchema, emailSchema } from "@/shared/schemas/email.schemas";
import { phoneSchema } from "@/shared/schemas/phone.schemas";
import { confirmCheckoutSchema } from "@/modules/payments/schemas/checkout.schema";
import {
	markAsShippedSchema,
	updateOrderCustomerInfoSchema,
	updateOrderShippingAddressSchema,
	updateTrackingSchema,
} from "@/modules/orders/schemas/order.schemas";
import { imageSchema } from "@/modules/products/schemas/product-media.schemas";
import { createProductSkuSchema } from "@/modules/skus/schemas/sku.schemas";

// ============================================================================
// Introspection Zod v4
// ============================================================================

type ZodInternals = {
	type?: string;
	shape?: Record<string, unknown>;
	innerType?: unknown;
	in?: unknown;
	out?: unknown;
	options?: readonly unknown[];
	values?: readonly unknown[];
	entries?: Record<string, unknown>;
};

const internals = (schema: unknown): ZodInternals | undefined =>
	(schema as { _zod?: { def?: ZodInternals } } | undefined)?._zod?.def;

/**
 * Retire les enveloppes qui masquent le type string sous-jacent (`.optional()`,
 * `.nullable()`, `.default()`, `.catch()`, `.readonly()`).
 *
 * ⚠️ NE traverse PAS les `pipe` : un pipe a deux côtés qui peuvent porter chacun
 * leur borne, et n'en retenir qu'un rendrait le test aveugle à l'autre. C'est
 * `maxLengthOf` qui les explore, en gardant la plus stricte.
 */
function unwrap(schema: unknown): unknown {
	let current = schema;
	for (let depth = 0; depth < 10; depth++) {
		const def = internals(current);
		if (def?.innerType === undefined) return current;
		current = def.innerType;
	}
	return current;
}

/**
 * Borne de longueur EFFECTIVE d'un schéma string, `null` si la valeur peut être
 * arbitrairement longue.
 *
 * Trois compositions à distinguer, et se tromper de sens rend le test faux :
 *
 *  - **`pipe`** (produit par tout `.transform()`) — la valeur doit satisfaire
 *    l'entrée PUIS la sortie : la borne la plus STRICTE gagne.
 *  - **`union`** (produit par `.or(…)`, très utilisé ici sous la forme
 *    `z.string().max(n).optional().or(z.literal(""))`) — la valeur passe si UN
 *    membre l'accepte : la borne la plus LARGE gagne, et un seul membre non borné
 *    rend l'union non bornée.
 *  - **`literal`** — une constante string est bornée par sa propre longueur. Sans ce
 *    cas, `z.literal("")` compterait comme « non borné » et rendrait non bornées
 *    toutes les unions ci-dessus.
 */
function maxLengthOf(schema: unknown): number | null {
	const unwrapped = unwrap(schema);
	const def = internals(unwrapped);

	if (def?.type === "pipe") {
		const sides = [maxLengthOf(def.in), maxLengthOf(def.out)].filter(
			(value): value is number => value !== null,
		);
		return sides.length > 0 ? Math.min(...sides) : null;
	}

	if (def?.type === "union") {
		const options = def.options ?? [];
		if (options.length === 0) return null;
		const bounds = options.map(maxLengthOf);
		// Un seul membre non borné suffit à rendre l'union non bornée.
		return bounds.some((bound) => bound === null) ? null : Math.max(...(bounds as number[]));
	}

	if (def?.type === "literal") {
		const values = def.values ?? [];
		if (values.length === 0 || !values.every((value) => typeof value === "string")) return null;
		return Math.max(...(values as string[]).map((value) => value.length));
	}

	// Un `z.enum` est borné par son membre le plus long — nécessaire pour les
	// colonnes VarChar alimentées par un enum applicatif sans CHECK DB
	// (ex. `carrierEnum` → `Order.shippingCarrier VarChar(30)`).
	if (def?.type === "enum") {
		const entries = Object.values(def.entries ?? {});
		if (entries.length === 0 || !entries.every((value) => typeof value === "string")) return null;
		return Math.max(...(entries as string[]).map((value) => value.length));
	}

	const declared = (unwrapped as { maxLength?: number | null } | undefined)?.maxLength;
	return typeof declared === "number" ? declared : null;
}

/** Descend dans les `shape` imbriqués d'un schéma objet. */
function resolveField(root: z.ZodType, path: readonly string[]): unknown {
	let current: unknown = root;
	for (const key of path) {
		const def = internals(unwrap(current));
		const shape = def?.shape;
		if (!shape || !(key in shape)) {
			throw new Error(
				`Chemin introuvable : "${path.join(".")}" (bloqué sur "${key}"). Le schéma a-t-il été renommé ?`,
			);
		}
		current = shape[key];
	}
	return current;
}

// ============================================================================
// Largeurs déclarées dans schema.prisma
// ============================================================================

const SCHEMA_PRISMA = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

/** `Model.column` → `n` pour chaque `@db.VarChar(n)` du schéma. */
function parseVarcharWidths(source: string): Map<string, number> {
	const widths = new Map<string, number>();
	let model: string | null = null;

	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();

		const modelStart = /^model\s+(\w+)\s*\{/.exec(line);
		if (modelStart) {
			model = modelStart[1]!;
			continue;
		}
		if (line === "}") {
			model = null;
			continue;
		}
		if (model === null || line.startsWith("//")) continue;

		const field = /^(\w+)\s+\S+.*@db\.VarChar\((\d+)\)/.exec(line);
		if (field) {
			widths.set(`${model}.${field[1]!}`, Number(field[2]!));
		}
	}

	return widths;
}

const VARCHAR_WIDTHS = parseVarcharWidths(SCHEMA_PRISMA);

// ============================================================================
// Paires déclarées
// ============================================================================

type Pair = {
	/** Libellé lisible, utilisé comme nom de cas de test. */
	readonly label: string;
	readonly schema: z.ZodType;
	readonly path: readonly string[];
	/** `Model.column` tel qu'écrit dans `schema.prisma`. */
	readonly column: string;
	/** Pourquoi la borne Zod peut être PLUS STRICTE que la colonne, le cas échéant. */
	readonly note?: string;
};

const PAIRS: readonly Pair[] = [
	// ── Checkout : le chemin le plus exposé (action publique, invités) ──────────
	{
		label: "checkout · fullName → Order.customerName",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "fullName"],
		column: "Order.customerName",
		note: "Recomposé `${firstName} ${lastName}` dans order-creation.service.ts",
	},
	{
		label: "checkout · addressLine1 → Order.shippingAddress1",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "addressLine1"],
		column: "Order.shippingAddress1",
	},
	{
		label: "checkout · addressLine2 → Order.shippingAddress2",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "addressLine2"],
		column: "Order.shippingAddress2",
	},
	{
		label: "checkout · city → Order.shippingCity",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "city"],
		column: "Order.shippingCity",
	},
	{
		label: "checkout · postalCode → Order.shippingPostalCode",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "postalCode"],
		column: "Order.shippingPostalCode",
	},
	{
		label: "checkout · phoneNumber → Order.shippingPhone",
		schema: confirmCheckoutSchema,
		path: ["shippingAddress", "phoneNumber"],
		column: "Order.shippingPhone",
	},
	{
		label: "checkout · email → Order.customerEmail",
		schema: confirmCheckoutSchema,
		path: ["email"],
		column: "Order.customerEmail",
	},

	// ── Schémas partagés, pris à la racine (ils alimentent auth + admin) ────────
	{ label: "emailSchema → User.email", schema: emailSchema, path: [], column: "User.email" },
	{
		label: "emailOptionalSchema → Order.customerEmail",
		schema: emailOptionalSchema,
		path: [],
		column: "Order.customerEmail",
	},

	// ── Admin commandes ────────────────────────────────────────────────────────
	{
		label: "markAsShipped · trackingNumber → Order.trackingNumber",
		schema: markAsShippedSchema,
		path: ["trackingNumber"],
		column: "Order.trackingNumber",
	},
	{
		label: "updateTracking · trackingNumber → Order.trackingNumber",
		schema: updateTrackingSchema,
		path: ["trackingNumber"],
		column: "Order.trackingNumber",
	},
	{
		label: "markAsShipped · trackingUrl → Order.trackingUrl",
		schema: markAsShippedSchema,
		path: ["trackingUrl"],
		column: "Order.trackingUrl",
	},
	{
		label: "updateTracking · trackingUrl → Order.trackingUrl",
		schema: updateTrackingSchema,
		path: ["trackingUrl"],
		column: "Order.trackingUrl",
	},
	{
		label: "markAsShipped · carrier → Order.shippingCarrier",
		schema: markAsShippedSchema,
		path: ["carrier"],
		column: "Order.shippingCarrier",
		note: "Enum borné par son membre le plus long (13) — la colonne (30) n'a aucun CHECK DB",
	},
	{
		label: "updateTracking · carrier → Order.shippingCarrier",
		schema: updateTrackingSchema,
		path: ["carrier"],
		column: "Order.shippingCarrier",
		note: "Enum borné par son membre le plus long (13) — la colonne (30) n'a aucun CHECK DB",
	},
	{
		label: "updateOrderCustomerInfo · customerEmail → Order.customerEmail",
		schema: updateOrderCustomerInfoSchema,
		path: ["customerEmail"],
		column: "Order.customerEmail",
	},
	{
		label: "phoneSchema → Order.shippingPhone",
		schema: phoneSchema,
		path: [],
		column: "Order.shippingPhone",
	},
	{
		label: "updateOrderShippingAddress · shippingPhone → Order.shippingPhone",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingPhone"],
		column: "Order.shippingPhone",
	},
	{
		label: "updateOrderCustomerInfo · customerName → Order.customerName",
		schema: updateOrderCustomerInfoSchema,
		path: ["customerName"],
		column: "Order.customerName",
	},
	{
		label: "updateOrderShippingAddress · shippingFirstName → Order.shippingFirstName",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingFirstName"],
		column: "Order.shippingFirstName",
	},
	{
		label: "updateOrderShippingAddress · shippingLastName → Order.shippingLastName",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingLastName"],
		column: "Order.shippingLastName",
	},
	{
		label: "updateOrderShippingAddress · shippingAddress1 → Order.shippingAddress1",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingAddress1"],
		column: "Order.shippingAddress1",
	},
	{
		label: "updateOrderShippingAddress · shippingAddress2 → Order.shippingAddress2",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingAddress2"],
		column: "Order.shippingAddress2",
	},
	{
		label: "updateOrderShippingAddress · shippingPostalCode → Order.shippingPostalCode",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingPostalCode"],
		column: "Order.shippingPostalCode",
	},
	{
		label: "updateOrderShippingAddress · shippingCity → Order.shippingCity",
		schema: updateOrderShippingAddressSchema,
		path: ["shippingCity"],
		column: "Order.shippingCity",
	},

	// ── Catalogue ──────────────────────────────────────────────────────────────
	{
		label: "media · url → SkuMedia.url",
		schema: imageSchema,
		path: ["url"],
		column: "SkuMedia.url",
	},
	{
		label: "media · thumbnailUrl → SkuMedia.thumbnailUrl",
		schema: imageSchema,
		path: ["thumbnailUrl"],
		column: "SkuMedia.thumbnailUrl",
	},
	{
		label: "media · altText → SkuMedia.altText",
		schema: imageSchema,
		path: ["altText"],
		column: "SkuMedia.altText",
		note: "200 côté Zod vs 255 en base — mismatch dans le bon sens",
	},
	{
		label: "createSku · sku → ProductSku.sku",
		schema: createProductSkuSchema,
		path: ["sku"],
		column: "ProductSku.sku",
	},
];

// ============================================================================
// Tests
// ============================================================================

describe("contrat · parité longueurs Zod ↔ colonnes Prisma", () => {
	describe("garde-fous du garde-fou", () => {
		it("le parseur de schema.prisma trouve réellement des colonnes", () => {
			// Sans cette assertion, une regex cassée rendrait `VARCHAR_WIDTHS` vide et
			// TOUTES les paires seraient ignorées en silence.
			expect(VARCHAR_WIDTHS.size).toBeGreaterThan(50);
			expect(VARCHAR_WIDTHS.get("Order.trackingNumber")).toBe(50);
			expect(VARCHAR_WIDTHS.get("Order.customerName")).toBe(100);
			expect(VARCHAR_WIDTHS.get("Order.customerEmail")).toBe(255);
			expect(VARCHAR_WIDTHS.get("SkuMedia.url")).toBe(2048);
		});

		it("l'extracteur de borne lit les formes réellement utilisées dans le repo", () => {
			expect(maxLengthOf(z.string().max(50))).toBe(50);
			expect(maxLengthOf(z.string().max(50).optional().nullable())).toBe(50);
			expect(maxLengthOf(z.email().max(255).toLowerCase().trim())).toBe(255);
			expect(
				maxLengthOf(
					z
						.url()
						.max(2048)
						.refine(() => true),
				),
			).toBe(2048);
			// pipe : la borne peut être d'un côté ou de l'autre, la plus stricte gagne
			expect(
				maxLengthOf(
					z
						.string()
						.transform((v) => v)
						.pipe(z.string().max(20)),
				),
			).toBe(20);
			expect(
				maxLengthOf(
					z
						.string()
						.max(9)
						.transform((v) => v)
						.pipe(z.string().max(20)),
				),
			).toBe(9);
			// union `.or(z.literal(""))` : la plus LARGE gagne, et un littéral string
			// compte pour sa propre longueur (sinon toutes ces unions passeraient pour
			// non bornées et le test serait vacuellement vert)
			expect(maxLengthOf(z.string().max(50).optional().or(z.literal("")))).toBe(50);
			expect(maxLengthOf(z.string().max(3).or(z.literal("hello")))).toBe(5);
			expect(maxLengthOf(z.string().max(50).or(z.string()))).toBeNull();
			// enum : borné par son membre le plus long
			expect(maxLengthOf(z.enum(["a", "abcdef"]))).toBe(6);
			expect(maxLengthOf(z.enum(["a", "abcdef"]).optional())).toBe(6);
			// et une absence de borne se voit
			expect(maxLengthOf(z.string())).toBeNull();
			expect(maxLengthOf(z.email())).toBeNull();
		});

		it("l'extracteur signale un chemin qui n'existe plus", () => {
			expect(() => resolveField(confirmCheckoutSchema, ["shippingAddress", "nope"])).toThrow(
				/Chemin introuvable/,
			);
		});

		it("couvre un nombre plausible de paires", () => {
			expect(PAIRS.length).toBeGreaterThanOrEqual(24);
		});
	});

	describe("chaque champ déclaré tient dans sa colonne", () => {
		it.each(PAIRS.map((pair) => [pair.label, pair] as const))("%s", (_label, pair) => {
			const columnWidth = VARCHAR_WIDTHS.get(pair.column);
			expect(
				columnWidth,
				`Colonne "${pair.column}" absente de schema.prisma — renommée ou supprimée ?`,
			).toBeDefined();

			const zodMax = maxLengthOf(resolveField(pair.schema, pair.path));
			expect(
				zodMax,
				`Aucune borne \`.max()\` sur ce champ : une saisie trop longue passera Zod puis lèvera un 22001 Postgres sur ${pair.column} (VarChar(${columnWidth})).`,
			).not.toBeNull();

			expect(
				zodMax!,
				`Zod accepte ${zodMax} caractères pour ${pair.column} qui n'en stocke que ${columnWidth}.`,
			).toBeLessThanOrEqual(columnWidth!);
		});
	});
});
