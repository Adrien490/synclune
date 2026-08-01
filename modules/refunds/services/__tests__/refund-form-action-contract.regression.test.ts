/**
 * @regression refund-form-action-contract
 *
 * Le formulaire admin de remboursement sérialise `formatItemsForAction(...)` dans
 * un `<input type="hidden" name="items">` (create-refund-form.tsx), que
 * `createRefund` re-parse via `safeFormGetJSON` puis valide avec
 * `createRefundSchema`. Les deux côtés étaient testés isolément avec des contrats
 * CONTRADICTOIRES : le service n'émettait pas `amount` (un test assertait même son
 * absence), que le schéma exige sans défaut — chaque soumission finissait en
 * VALIDATION_ERROR silencieux (`create-toast-callbacks` filtre ce statut, donc pas
 * de toast), rendant la création de remboursement Stripe impossible depuis l'admin
 * (audit « Admin commandes » 2026-08-01, P0-1).
 *
 * Ce test rejoue la couture EXACTE form → JSON → FormData → safeFormGetJSON →
 * createRefundSchema, pour que les deux contrats ne puissent plus diverger
 * silencieusement.
 */

import { describe, expect, it } from "vitest";
import { RefundReason } from "@/app/generated/prisma/enums";
import { safeFormGetJSON } from "@/shared/lib/actions/validation";
import { createRefundSchema } from "../../schemas/refund.schemas";
import {
	calculateRefundAmount,
	formatItemsForAction,
	type OrderItemForRefundCalc,
} from "../refund-calculation.service";
import type { RefundItemValue } from "../../types/refund.types";

// Ids réalistes : cuid2 = 24 caractères alphanumériques (cf. cursor-accepts-real-ids)
const ORDER_ID = "tz4a98xxat96iws9zmbrgj3a";
const ITEM_ID_1 = "pfh0haxfpzowht3oi213cqos";
const ITEM_ID_2 = "ya6mp7f0cbxewpsmgnkr8yer";

const orderItems: OrderItemForRefundCalc[] = [
	{ id: ITEM_ID_1, quantity: 2, price: 2599, refundItems: [] },
	{ id: ITEM_ID_2, quantity: 1, price: 4900, refundItems: [] },
];

const selectedItems: RefundItemValue[] = [
	{ orderItemId: ITEM_ID_1, quantity: 2, restock: true, selected: true, restockTouched: true },
	{ orderItemId: ITEM_ID_2, quantity: 1, restock: false, selected: true },
];

const discount = { subtotal: 10098, discountAmount: 1000 };

function submitLikeTheForm(itemsForAction: unknown) {
	// Couture exacte : hidden input → FormData → safeFormGetJSON → schéma
	const formData = new FormData();
	formData.set("items", JSON.stringify(itemsForAction));
	const items = safeFormGetJSON<unknown>(formData, "items");

	return createRefundSchema.safeParse({
		orderId: ORDER_ID,
		reason: RefundReason.CUSTOMER_REQUEST,
		note: "",
		items,
		acceptCancelledOrder: false,
	});
}

describe("couture formulaire → createRefund (@regression refund-form-action-contract)", () => {
	it("le payload du formulaire passe la validation Zod de l'action", () => {
		const itemsForAction = formatItemsForAction(selectedItems, orderItems, discount);
		const parsed = submitLikeTheForm(itemsForAction);

		expect(parsed.success).toBe(true);
	});

	it("chaque amount égale le plafond serveur — aucun clamp silencieux dans create-refund", () => {
		const itemsForAction = formatItemsForAction(selectedItems, orderItems, discount);

		// Formule miroir de create-refund.ts : maxItemAmount = round(price × qty × (1 − ratio))
		const ratio = Math.min(discount.discountAmount / discount.subtotal, 1);
		for (const item of itemsForAction) {
			const orderItem = orderItems.find((oi) => oi.id === item.orderItemId);
			expect(item.amount).toBe(Math.round((orderItem?.price ?? 0) * item.quantity * (1 - ratio)));
		}
	});

	it("la somme des amounts égale le total affiché sur le bouton (calculateRefundAmount)", () => {
		const itemsForAction = formatItemsForAction(selectedItems, orderItems, discount);
		const totalOnButton = calculateRefundAmount(selectedItems, orderItems, discount);

		expect(itemsForAction.reduce((sum, item) => sum + item.amount, 0)).toBe(totalOnButton);
	});

	it("sans remise, amount = prix × quantité", () => {
		const itemsForAction = formatItemsForAction(selectedItems, orderItems);

		expect(itemsForAction.find((i) => i.orderItemId === ITEM_ID_1)?.amount).toBe(2599 * 2);
		expect(itemsForAction.find((i) => i.orderItemId === ITEM_ID_2)?.amount).toBe(4900);
		expect(submitLikeTheForm(itemsForAction).success).toBe(true);
	});
});
