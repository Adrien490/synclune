import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", () => ({ notDeleted: { deletedAt: null } }));

import { ORDERS_TO_SHIP_HREF, TO_SHIP_FULFILLMENT_STATUSES } from "../to-ship";
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
		expect(where.fulfillmentStatus).toEqual({ in: ["UNFULFILLED", "PROCESSING"] });
	});

	it("exclut les commandes annulées et supprimées", () => {
		const where = buildToShipWhereClause();
		expect(where.status).toEqual({ not: "CANCELLED" });
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

	it("répète filter_fulfillmentStatus pour chaque statut du prédicat", () => {
		const params = new URLSearchParams(ORDERS_TO_SHIP_HREF.split("?")[1]);
		expect(params.getAll("filter_fulfillmentStatus")).toEqual([...TO_SHIP_FULFILLMENT_STATUSES]);
	});
});
