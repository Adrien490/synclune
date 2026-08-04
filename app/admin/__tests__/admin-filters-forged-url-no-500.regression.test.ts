/**
 * @regression admin-filters-forged-url-no-500
 *
 * Une URL forgée ne doit jamais produire un 500 sur une liste admin.
 *
 * ⚠️ Les filtres d'énumération étaient castés depuis l'URL sans contrôle
 * d'appartenance (`filterValues as OrderFilters["status"]`). TypeScript accepte le
 * cast, mais le schéma de la couche `data/` est strict — et `getOrders` **throw**
 * hors du `try/catch` de son fetcher :
 *
 *     const validation = getOrdersSchema.safeParse(params);
 *     if (!validation.success) throw new Error("Invalid parameters: " + …);
 *
 * `?filter_status=BOGUS` renvoyait donc l'error boundary. Le parseur des commandes
 * était pourtant déjà conscient de la règle — son commentaire dit littéralement
 * « Une URL forgée ne doit jamais produire un 500 » — et l'appliquait aux montants
 * (`parseAmountToCents`) et aux dates (`parseDate`). Les quatre enums avaient été
 * oubliés.
 *
 * Invariant : une valeur hors enum vaut « pas de filtre » (`undefined`), jamais une
 * valeur propagée telle quelle.
 */

import { describe, expect, it } from "vitest";

import {
	InvoiceStatus,
	OrderStatus,
	PaymentStatus,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/enums";
import { parseFilters } from "@/app/admin/ventes/commandes/_utils/params";
import { parseRefundFilters } from "@/app/admin/ventes/remboursements/_utils/params";
import { getAllParamsIn, getFirstParamIn } from "@/shared/utils/params";

describe("@regression filtres admin — URL forgée", () => {
	describe("helpers partagés", () => {
		it("ne retient que les valeurs de l'enum", () => {
			expect(getAllParamsIn(["PAID", "BOGUS"], Object.values(PaymentStatus))).toEqual(["PAID"]);
			expect(getFirstParamIn("BOGUS", Object.values(RefundStatus))).toBeUndefined();
		});

		it("rend `undefined` — « pas de filtre » — quand rien ne survit", () => {
			// Et NON un tableau vide, qui exprimerait « filtre ne matchant rien ».
			expect(getAllParamsIn(["BOGUS", "NOPE"], Object.values(OrderStatus))).toBeUndefined();
		});

		it("préserve la multi-sélection légitime", () => {
			expect(getAllParamsIn(["PAID", "PENDING"], Object.values(PaymentStatus))).toEqual([
				"PAID",
				"PENDING",
			]);
		});
	});

	describe("liste des commandes", () => {
		const forged = {
			filter_status: "DROP TABLE",
			filter_paymentStatus: "../../etc",
			filter_invoiceStatus: "<script>",
		};

		it("neutralise les 4 enums forgés", () => {
			const filters = parseFilters(forged);

			expect(filters?.status).toBeUndefined();
			expect(filters?.paymentStatus).toBeUndefined();
			expect(filters?.status).toBeUndefined();
			expect(filters?.invoiceStatus).toBeUndefined();
		});

		// TROIS enums depuis le Lot 4 : `FulfillmentStatus` a fusionné dans `OrderStatus`.
		it("laisse passer les 3 enums valides (contre-épreuve)", () => {
			const filters = parseFilters({
				filter_status: OrderStatus.PROCESSING,
				filter_paymentStatus: PaymentStatus.PAID,
				filter_invoiceStatus: InvoiceStatus.GENERATED,
			});

			expect(filters?.status).toEqual([OrderStatus.PROCESSING]);
			expect(filters?.paymentStatus).toEqual([PaymentStatus.PAID]);
			expect(filters?.invoiceStatus).toEqual([InvoiceStatus.GENERATED]);
		});

		it("ne garde que la partie valide d'une multi-sélection panachée", () => {
			const filters = parseFilters({
				filter_paymentStatus: [PaymentStatus.PAID, "BOGUS", PaymentStatus.PENDING],
			});

			expect(filters?.paymentStatus).toEqual([PaymentStatus.PAID, PaymentStatus.PENDING]);
		});
	});

	describe("liste des remboursements", () => {
		it("neutralise les enums forgés", () => {
			const filters = parseRefundFilters({ filter_status: "BOGUS", filter_reason: "../../x" });

			expect(filters.status).toBeUndefined();
			expect(filters.reason).toBeUndefined();
		});

		it("laisse passer les enums valides (contre-épreuve)", () => {
			const filters = parseRefundFilters({
				filter_status: RefundStatus.PENDING,
				filter_reason: RefundReason.DEFECTIVE,
			});

			expect(filters.status).toBe(RefundStatus.PENDING);
			expect(filters.reason).toBe(RefundReason.DEFECTIVE);
		});

		it("rejette une date illisible au lieu de propager un `Invalid Date`", () => {
			// `new Date("garbage")` satisfait le type `Date` mais fait échouer le schéma
			// en aval — même famille de 500 que les enums.
			const filters = parseRefundFilters({
				filter_createdAfter: "garbage",
				filter_createdBefore: "2026-13-45",
			});

			expect(filters.createdAfter).toBeUndefined();
			expect(filters.createdBefore).toBeUndefined();
		});

		it("accepte une date ISO valide (contre-épreuve)", () => {
			const filters = parseRefundFilters({ filter_createdAfter: "2026-07-31" });

			expect(filters.createdAfter).toBeInstanceOf(Date);
			expect(Number.isNaN(filters.createdAfter!.getTime())).toBe(false);
		});
	});
});
