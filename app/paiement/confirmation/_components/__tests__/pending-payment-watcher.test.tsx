import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRouterRefresh, mockRouterReplace, mockUseRouter, mockFetch } = vi.hoisted(() => ({
	mockRouterRefresh: vi.fn(),
	mockRouterReplace: vi.fn(),
	mockUseRouter: vi.fn(),
	mockFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

import { PendingPaymentWatcher } from "../pending-payment-watcher";

beforeEach(() => {
	vi.clearAllMocks();
	mockUseRouter.mockReturnValue({ refresh: mockRouterRefresh, replace: mockRouterReplace });

	(globalThis as any).fetch = mockFetch;
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		configurable: true,
	});
});

afterEach(() => {
	cleanup();
});

const ORDER_ID = "kjlqzsfgwerthnvbcxmaqwer";
const ORDER_NUMBER = "SYN-2026-0042";

function setupFetch(payload: { paymentStatus: string; status: string }) {
	mockFetch.mockResolvedValue({
		ok: true,
		json: vi.fn().mockResolvedValue(payload),
	} as unknown as Response);
}

describe("PendingPaymentWatcher", () => {
	/**
	 * @regression pending-payment-watcher-announces-2026-08-07
	 *
	 * ⚠️ Ce test exigeait `container.firstChild === null` : le composant ne rendait
	 * RIEN pendant toute la vérification. C'est précisément le défaut — le sondage
	 * dure jusqu'à 30 s, au terme desquelles il peut réécrire la page
	 * (`router.refresh()`) ou changer de route (`router.replace()`), sans qu'un
	 * lecteur d'écran ait jamais su qu'une vérification était en cours.
	 *
	 * La région est désormais montée EN PERMANENCE — une région live créée avec son
	 * contenu n'est pas annoncée de façon fiable — et seul son texte change.
	 */
	it("annonce la vérification en cours, sans rien afficher", () => {
		setupFetch({ paymentStatus: "PENDING", status: "PENDING" });
		const { container } = render(
			<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />,
		);

		const region = container.firstChild as HTMLElement;
		expect(region).not.toBeNull();
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region.className).toContain("sr-only");
		expect(region.textContent).toMatch(/vérification du paiement en cours/i);
	});

	it("calls router.refresh() when polling detects PAID", async () => {
		setupFetch({ paymentStatus: "PAID", status: "PROCESSING" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockRouterRefresh).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(mockRouterReplace).not.toHaveBeenCalled();
	});

	it("redirects to /paiement/annulation when polling detects FAILED", async () => {
		setupFetch({ paymentStatus: "FAILED", status: "CANCELLED" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(mockRouterReplace.mock.calls[0]?.[0]).toContain("/paiement/annulation");
		expect(mockRouterReplace.mock.calls[0]?.[0]).toContain("reason=payment_failed");
	});

	it("calls fetch with the correct status endpoint URL", async () => {
		setupFetch({ paymentStatus: "PAID", status: "PROCESSING" });
		render(<PendingPaymentWatcher orderId={ORDER_ID} orderNumber={ORDER_NUMBER} />);

		await waitFor(() => expect(mockFetch).toHaveBeenCalled(), { timeout: 5000 });
		expect(mockFetch.mock.calls[0]?.[0]).toBe(
			`/api/orders/${ORDER_NUMBER}/status?orderId=${ORDER_ID}`,
		);
	});
});
