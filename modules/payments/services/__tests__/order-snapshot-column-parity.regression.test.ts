import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-snapshot-column-parity-2026-08-07
 *
 * Parité champ-à-champ entre les colonnes de SNAPSHOT d'`Order` déclarées au schéma
 * Prisma et ce que la transaction de checkout écrit réellement.
 *
 * ## Le trou que ce test ferme
 *
 * L'invariant 5 de CLAUDE.md dit « `shipping*` (+ `customer*`) copiés champ-à-champ
 * depuis le formulaire dans la tx de création ». Jusqu'au 2026-08-07, RIEN ne le
 * vérifiait dans ce sens :
 *
 *  - `order-creation.service.test.ts` assert les valeurs avec un `toMatchObject` dont
 *    les clés sont écrites À LA MAIN. `toMatchObject` autorise le sur-ensemble : une
 *    colonne de snapshot ajoutée au schéma et NON écrite par le service laisse ce test
 *    parfaitement vert.
 *  - `test/contract/transactional-writes-schema-validity.contract.test.ts` ne teste que
 *    la direction INVERSE — « aucune clé écrite qui n'existe pas au schéma ». Une
 *    colonne du schéma que personne n'écrit lui est invisible.
 *  - `tsc` non plus : une colonne `String?` ou `@default(...)` absente d'un `create`
 *    est parfaitement légale côté types.
 *
 * Résultat : une colonne de snapshot pouvait naître NULL/vide sur toutes les commandes
 * sans qu'aucun outil ne le signale. C'est exactement ce qui est arrivé à `skuSku`
 * (déclaré au schéma, jamais écrit au `create` → toujours NULL, factures sans référence
 * article, trouvé à l'audit du 2026-07-02) et aux 9 colonnes `billing*` (jamais
 * renseignées sur une commande réelle, droppées le 2026-08-04 après deux ans).
 *
 * ⚠️ L'oracle est le SCHÉMA, pas une liste. Ajouter une colonne `shipping*`/`customer*`
 * à `Order` fait rougir ce test tant que la tx de checkout ne l'écrit pas — c'est le
 * comportement voulu : soit on la remplit, soit on l'inscrit dans `NON_SNAPSHOT_COLUMNS`
 * avec sa raison.
 */

const REPO_ROOT = process.cwd();

const SCHEMA_PATH = join(REPO_ROOT, "prisma", "schema.prisma");
const ORDER_CREATION_PATH = join(
	REPO_ROOT,
	"modules",
	"payments",
	"services",
	"order-creation.service.ts",
);

/**
 * Colonnes préfixées `customer`/`shipping` qui ne sont PAS du snapshot d'identité ou de
 * destination, donc légitimement absentes du `create` de checkout.
 *
 * Chaque entrée porte sa raison — c'est la seule dérogation possible, et elle doit être
 * argumentée, pas simplement ajoutée pour faire passer le test.
 */
const NON_SNAPSHOT_COLUMNS: Record<string, string> = {
	// Montant calculé par `calculateShipping`, pas une donnée du formulaire. Il EST
	// écrit au `create`, mais il relève de l'arithmétique de commande (CHECK
	// `Order_total_formula`), pas du snapshot d'adresse.
	shippingCost: "montant calculé, pas une donnée de formulaire",
	// Renseignés à l'EXPÉDITION (`mark-as-shipped`, `update-tracking`), des jours après
	// le checkout. Les écrire à la création n'aurait aucun sens.
	shippingCarrier: "posé à l'expédition",
	shippedAt: "posé à l'expédition",
};

/** Extrait le corps du bloc `model <name> { … }` de `schema.prisma`. */
function extractModelBlock(schema: string, modelName: string): string {
	const header = new RegExp(`^model\\s+${modelName}\\s*\\{`, "m").exec(schema);
	if (!header) throw new Error(`model ${modelName} introuvable dans schema.prisma`);
	const start = header.index + header[0].length - 1;
	let depth = 0;
	for (let i = start; i < schema.length; i++) {
		if (schema[i] === "{") depth++;
		else if (schema[i] === "}") {
			depth--;
			if (depth === 0) return schema.slice(start + 1, i);
		}
	}
	throw new Error(`bloc model ${modelName} déséquilibré`);
}

/**
 * Noms de champs déclarés dans un bloc de modèle Prisma.
 *
 * ⚠️ Les commentaires sont retirés AVANT le parsing : le bloc `Order` est très commenté
 * et cite nommément des colonnes RETIRÉES (`stripeChargeId`, `discountAmount`,
 * `invoiceDataSnapshot`, `billing*`…). Les compter comme des champs ferait échouer ce
 * test sur des colonnes qui n'existent plus.
 */
function extractFieldNames(modelBlock: string): string[] {
	return modelBlock
		.split("\n")
		.map((line) => line.replace(/\/\/.*$/, "").trim())
		.filter((line) => line.length > 0 && !line.startsWith("@@"))
		.map((line) => /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(line)?.[1])
		.filter((name): name is string => Boolean(name));
}

/** Clés de premier niveau d'un littéral objet (ignore les objets imbriqués). */
function extractTopLevelKeys(objectLiteral: string): string[] {
	const inner = objectLiteral.slice(1, -1);
	const keys: string[] = [];
	let depth = 0;
	let lineStart = 0;
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (ch === "{" || ch === "[" || ch === "(") depth++;
		else if (ch === "}" || ch === "]" || ch === ")") depth--;
		else if (ch === "," && depth === 0) {
			const key = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(inner.slice(lineStart, i))?.[1];
			if (key) keys.push(key);
			lineStart = i + 1;
		}
	}
	const last = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(inner.slice(lineStart))?.[1];
	if (last) keys.push(last);
	return keys;
}

/** Le bloc `data: { … }` de `tx.order.create({ data: { … } })`, sans les commentaires. */
function extractCheckoutOrderCreateData(): string {
	const source = readFileSync(ORDER_CREATION_PATH, "utf-8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "");
	const call = /\b(?:prisma|tx)\.order\.create\s*\(\s*\{/.exec(source);
	if (!call) throw new Error("aucun `tx.order.create({` dans order-creation.service.ts");
	const dataOpen = /\bdata\s*:\s*\{/.exec(source.slice(call.index));
	if (!dataOpen) throw new Error("aucun bloc `data: {` dans le `tx.order.create`");
	const start = call.index + dataOpen.index + dataOpen[0].length - 1;
	let depth = 0;
	for (let i = start; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
			depth--;
			if (depth === 0) return source.slice(start, i + 1);
		}
	}
	throw new Error("bloc `data: {` déséquilibré");
}

const orderModel = extractModelBlock(readFileSync(SCHEMA_PATH, "utf-8"), "Order");
const orderFields = extractFieldNames(orderModel);
const snapshotColumns = orderFields
	.filter((name) => /^(?:customer|shipping)[A-Z]/.test(name))
	.filter((name) => !(name in NON_SNAPSHOT_COLUMNS));

const createdKeys = extractTopLevelKeys(extractCheckoutOrderCreateData());

describe("Snapshots Order — parité colonnes schéma ↔ transaction de checkout (Invariant #5)", () => {
	it("parses the Order model and the checkout create (garde-fou de l'oracle)", () => {
		// Sans ces bornes, une regex qui ne matche plus rendrait des listes VIDES et
		// toutes les assertions ci-dessous passeraient au vert sans rien vérifier.
		expect(orderFields).toContain("orderNumber");
		expect(orderFields).toContain("shippingPhone");
		expect(orderFields).not.toContain("billingFirstName");
		expect(createdKeys.length).toBeGreaterThan(8);

		// Les 10 colonnes de snapshot connues au 2026-08-07. Un écart ici veut dire
		// qu'une colonne a été ajoutée ou retirée : mettre à jour ce chiffre EN MÊME
		// TEMPS que la tx, jamais après.
		expect(snapshotColumns.sort()).toEqual(
			[
				"customerEmail",
				"customerName",
				"shippingFirstName",
				"shippingLastName",
				"shippingAddress1",
				"shippingAddress2",
				"shippingPostalCode",
				"shippingCity",
				"shippingCountry",
				"shippingPhone",
			].sort(),
		);
	});

	it.each(snapshotColumns)(
		"la tx de checkout écrit la colonne de snapshot `%s`",
		(column: string) => {
			expect(createdKeys).toContain(column);
		},
	);

	it("n'écrit aucune colonne `billing*` (les 9 ont été droppées le 2026-08-04)", () => {
		// ⚠️ Cette assertion n'a d'objet QUE parce qu'elle est doublée d'un contrôle du
		// schéma : sans lui, « aucune clé billing* écrite » est vacuement vrai depuis que
		// les colonnes n'existent plus, et le test ne dirait plus rien.
		expect(orderFields.filter((name) => name.startsWith("billing"))).toEqual([]);
		expect(createdKeys.filter((key) => key.startsWith("billing"))).toEqual([]);
	});
});
