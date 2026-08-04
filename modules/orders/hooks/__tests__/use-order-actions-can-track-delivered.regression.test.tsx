/**
 * @regression ORD-UI-005
 *
 * Une commande DELIVERED avec `trackingUrl` doit conserver le lien
 * « Suivre le colis » dans le menu d'actions. Précédemment, `canTrack`
 * était calculé `isShipped && trackingUrl`, ce qui excluait DELIVERED
 * alors que la state machine `getOrderPermissions().canUpdateTracking`
 * autorise SHIPPED || DELIVERED.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";

// ============================================================================
// HOISTED MOCKS — couper le graphe de dépendances `useOrderActions`
// ============================================================================

// La chaîne actions → void-invoice → ensure-credit-note-archived tire
// UploadThing (UTApi server-only, throw en jsdom) — coupe à la racine.
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: {} }));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ isOpen: false, data: null, open: vi.fn(), close: vi.fn() }),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ isOpen: false, data: null, open: vi.fn(), close: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/modules/orders/hooks/use-resend-order-email", () => ({
	useResendOrderEmail: () => ({ resend: vi.fn(), isPending: false }),
}));

import { useOrderActions } from "../use-order-actions";

// ============================================================================
// HELPER
// ============================================================================

function findTrackingItem(sections: ReturnType<typeof useOrderActions>["sections"]) {
	const fulfillment = sections.find((s) => s.key === "fulfillment");
	return fulfillment?.items.find((i) => i.key === "tracking");
}

// ============================================================================
// TESTS
// ============================================================================

describe("useOrderActions — canTrack regression (ORD-UI-005)", () => {
	it("affiche « Suivre le colis » sur une commande SHIPPED avec trackingUrl", () => {
		const { result } = renderHook(() =>
			useOrderActions({
				order: {
					id: "o-shipped",
					orderNumber: "ORD-100",
					status: OrderStatus.SHIPPED,
					paymentStatus: PaymentStatus.PAID,
					trackingNumber: "ABC123",
					trackingUrl: "https://tracking.example/ABC123",
					invoiceNumber: null,
					invoiceStatus: null,
				},
			}),
		);

		const tracking = findTrackingItem(result.current.sections);
		expect(tracking).toBeDefined();
		expect(tracking?.hidden).toBe(false);
	});

	it("affiche « Suivre le colis » sur une commande DELIVERED avec trackingUrl (ORD-UI-005)", () => {
		const { result } = renderHook(() =>
			useOrderActions({
				order: {
					id: "o-delivered",
					orderNumber: "ORD-101",
					status: OrderStatus.DELIVERED,
					paymentStatus: PaymentStatus.PAID,
					trackingNumber: "ABC456",
					trackingUrl: "https://tracking.example/ABC456",
					invoiceNumber: "F-2026-00042",
					invoiceStatus: "GENERATED",
				},
			}),
		);

		const tracking = findTrackingItem(result.current.sections);
		expect(tracking).toBeDefined();
		expect(tracking?.hidden).toBe(false);
		// Le href doit pointer sur l'URL transporteur
		expect(tracking).toMatchObject({ href: "https://tracking.example/ABC456" });
	});

	it("masque « Suivre le colis » si trackingUrl absent (PROCESSING)", () => {
		const { result } = renderHook(() =>
			useOrderActions({
				order: {
					id: "o-proc",
					orderNumber: "ORD-102",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					trackingNumber: null,
					trackingUrl: null,
					invoiceNumber: null,
					invoiceStatus: null,
				},
			}),
		);

		const tracking = findTrackingItem(result.current.sections);
		expect(tracking?.hidden).toBe(true);
	});
});
