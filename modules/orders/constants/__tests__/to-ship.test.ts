import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", () => ({ notDeleted: { deletedAt: null } }));

import { ORDERS_TO_SHIP_HREF, TO_SHIP_ORDER_STATUSES } from "../to-ship";
// La clause `where` vit dans `services/` : elle a besoin de `notDeleted`, donc du
// client Prisma, que `constants/to-ship.ts` ne peut pas importer (graphe client).
import { buildToShipWhereClause } from "../../services/to-ship.service";
import { SHIPPABLE_PAYMENT_STATUSES } from "../revenue-status.constants";

describe("buildToShipWhereClause", () => {
	it("inclut les commandes partiellement remboursées (encore à expédier)", () => {
		const where = buildToShipWhereClause();
		expect(where.paymentStatus).toEqual({ in: ["PAID", "PARTIALLY_REFUNDED"] });
	});

	it("inclut « en préparation » — préparer n'est pas expédier", () => {
		const where = buildToShipWhereClause();
		expect(where.status).toEqual({ in: ["PENDING", "PROCESSING"] });
	});

	/**
	 * ⚠️ La garde a changé de FORME au Lot 4 (audit V2), pas d'intention.
	 *
	 * Elle s'écrivait `status: { not: CANCELLED }`, EN PLUS d'un filtre sur
	 * `fulfillmentStatus` : il fallait les deux, parce que `FulfillmentStatus`
	 * n'avait pas de membre `CANCELLED` et qu'annuler une commande laissait son
	 * fulfillment sur `PROCESSING` — la ligne restait donc dans la file.
	 *
	 * Sur un axe unique, l'exclusion devient STRUCTURELLE : `CANCELLED` n'est
	 * simplement pas dans la liste positive. Ce test l'assert explicitement pour
	 * qu'un futur élargissement de `TO_SHIP_ORDER_STATUSES` ne la rouvre pas en
	 * silence.
	 */
	it("exclut les commandes annulées, retournées et supprimées", () => {
		const where = buildToShipWhereClause();
		const statuses = (where.status as { in: string[] }).in;
		expect(statuses).not.toContain("CANCELLED");
		expect(statuses).not.toContain("RETURNED");
		expect(where.deletedAt).toBeNull();
	});

	it("n'inclut JAMAIS les commandes totalement remboursées (plus rien à expédier)", () => {
		const where = buildToShipWhereClause();
		const statuses = (where.paymentStatus as { in: string[] }).in;
		expect(statuses).not.toContain("REFUNDED");
	});
});

describe("ORDERS_TO_SHIP_HREF", () => {
	it("pointe vers la liste des commandes admin", () => {
		expect(ORDERS_TO_SHIP_HREF.startsWith("/admin/ventes/commandes?")).toBe(true);
	});

	/**
	 * Le lien est un miroir en query-string du prédicat Prisma. S'ils dérivent, la
	 * pastille annonce N mais la liste filtrée en montre un autre nombre — exactement
	 * le défaut que ce SSOT corrige.
	 */
	it("répète filter_paymentStatus pour chaque statut du prédicat", () => {
		const params = new URLSearchParams(ORDERS_TO_SHIP_HREF.split("?")[1]);
		expect(params.getAll("filter_paymentStatus")).toEqual([...SHIPPABLE_PAYMENT_STATUSES]);
	});

	it("répète filter_status pour chaque statut du prédicat", () => {
		const params = new URLSearchParams(ORDERS_TO_SHIP_HREF.split("?")[1]);
		expect(params.getAll("filter_status")).toEqual([...TO_SHIP_ORDER_STATUSES]);
	});

	/**
	 * Parité EFFECTIVE entre les deux surfaces, pas seulement leur forme : la liste
	 * du lien doit être exactement celle de la clause Prisma. C'est ce couplage que
	 * le SSOT existe pour garantir, et il n'était jusqu'ici vérifié qu'indirectement
	 * (chaque surface comparée à la constante, jamais l'une à l'autre).
	 */
	it("le miroir query-string et la clause Prisma portent la MÊME liste de statuts", () => {
		const params = new URLSearchParams(ORDERS_TO_SHIP_HREF.split("?")[1]);
		const fromWhere = (buildToShipWhereClause().status as { in: string[] }).in;
		expect(params.getAll("filter_status").sort()).toEqual([...fromWhere].sort());
	});
});
