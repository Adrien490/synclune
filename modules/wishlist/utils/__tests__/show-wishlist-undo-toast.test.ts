/**
 * `showWishlistUndoToast` — stratégie responsive (desktop : toast guidant avec
 * undo ; mobile : bref, undo opt-in) et rollback badge si l'undo échoue.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const mocks = vi.hoisted(() => ({
	addToWishlist: vi.fn(),
	incrementWishlist: vi.fn(),
	decrementWishlist: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
	isMobileViewport: vi.fn(),
}));

vi.mock("@/modules/wishlist/actions/add-to-wishlist", () => ({
	addToWishlist: mocks.addToWishlist,
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: {
		getState: () => ({
			incrementWishlist: mocks.incrementWishlist,
			decrementWishlist: mocks.decrementWishlist,
		}),
	},
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: mocks.toastSuccess, error: mocks.toastError },
	isMobileViewport: mocks.isMobileViewport,
}));

import { showWishlistUndoToast } from "../show-wishlist-undo-toast";

const PRODUCT_A = "cm1234567890abcdefghijk12";

type ToastOptions = {
	description?: string;
	duration?: number;
	action?: { label: string; onClick: () => Promise<void> };
};

function lastToastOptions(): ToastOptions {
	const call = mocks.toastSuccess.mock.calls.at(-1) as [string, ToastOptions?];
	return call[1] ?? {};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.isMobileViewport.mockReturnValue(false);
	mocks.addToWishlist.mockResolvedValue({
		status: ActionStatus.SUCCESS,
		message: "Ajouté à tes favoris",
	});
});

describe("showWishlistUndoToast", () => {
	it("desktop : toast persistant avec description guidante et action « Annuler »", () => {
		showWishlistUndoToast({ productId: PRODUCT_A, productTitle: "Bague pluie" });

		expect(mocks.toastSuccess).toHaveBeenCalledWith(
			"« Bague pluie » retiré de tes favoris",
			expect.objectContaining({
				description: expect.any(String),
				duration: 5000,
				action: expect.objectContaining({ label: "Annuler" }),
			}),
		);
	});

	it("mobile sans allowUndoOnMobile : toast bref SANS action (le cœur reste re-tapable)", () => {
		mocks.isMobileViewport.mockReturnValue(true);

		showWishlistUndoToast({ productId: PRODUCT_A, productTitle: "Bague pluie" });

		expect(mocks.toastSuccess).toHaveBeenCalledWith("« Bague pluie » retiré", {});
	});

	it("mobile avec allowUndoOnMobile (swipe grille) : l'undo est exposé", () => {
		mocks.isMobileViewport.mockReturnValue(true);

		showWishlistUndoToast({ productId: PRODUCT_A, allowUndoOnMobile: true });

		expect(lastToastOptions().action).toEqual(
			expect.objectContaining({ label: "Annuler", onClick: expect.any(Function) }),
		);
	});

	it("undo réussi : badge ré-incrémenté, ré-ajout via addToWishlist, toast de restauration, onRestored", async () => {
		const onRestored = vi.fn();
		showWishlistUndoToast({ productId: PRODUCT_A, productTitle: "Bague pluie", onRestored });

		await lastToastOptions().action?.onClick();

		expect(mocks.incrementWishlist).toHaveBeenCalledTimes(1);
		const formData = mocks.addToWishlist.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe(PRODUCT_A);
		expect(mocks.toastSuccess).toHaveBeenLastCalledWith(
			"« Bague pluie » restauré dans tes favoris",
		);
		expect(onRestored).toHaveBeenCalledTimes(1);
	});

	it("undo échoué : rollback du badge (decrement), toast d'erreur, PAS de onRestored", async () => {
		mocks.addToWishlist.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Ta liste de favoris est pleine (100 articles max)",
		});
		const onRestored = vi.fn();
		showWishlistUndoToast({ productId: PRODUCT_A, onRestored });

		await lastToastOptions().action?.onClick();

		expect(mocks.incrementWishlist).toHaveBeenCalledTimes(1);
		expect(mocks.decrementWishlist).toHaveBeenCalledTimes(1);
		expect(mocks.toastError).toHaveBeenCalledWith(
			"Ta liste de favoris est pleine (100 articles max)",
		);
		expect(onRestored).not.toHaveBeenCalled();
	});
});
