import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	COALESCE_WINDOW_MS,
	MICRO_TOAST_DURATION_MS,
	useMicroToastStore,
} from "@/shared/stores/micro-toast-store";

describe("useMicroToastStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		useMicroToastStore.setState({
			visible: false,
			message: "",
			variant: "success",
			key: 0,
			count: 1,
			currentDuration: MICRO_TOAST_DURATION_MS,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("initial state", () => {
		it("starts hidden with empty message and count=1", () => {
			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(false);
			expect(state.message).toBe("");
			expect(state.variant).toBe("success");
			expect(state.count).toBe(1);
		});
	});

	describe("show", () => {
		it("becomes visible with the provided message and variant", () => {
			useMicroToastStore.getState().show("Ajouté aux favoris", "success");
			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.message).toBe("Ajouté aux favoris");
			expect(state.variant).toBe("success");
			expect(state.count).toBe(1);
		});

		it("accepts the new bijoux variants (wishlist/cart/discount)", () => {
			useMicroToastStore.getState().show("Retiré", "wishlist");
			expect(useMicroToastStore.getState().variant).toBe("wishlist");
			useMicroToastStore.getState().show("Au panier", "cart");
			expect(useMicroToastStore.getState().variant).toBe("cart");
			useMicroToastStore.getState().show("Code promo", "discount");
			expect(useMicroToastStore.getState().variant).toBe("discount");
		});

		it("exposes currentDuration matching the show call", () => {
			useMicroToastStore.getState().show("Test", "success");
			expect(useMicroToastStore.getState().currentDuration).toBe(MICRO_TOAST_DURATION_MS);
			useMicroToastStore.getState().show("Long", "warning", 4000);
			expect(useMicroToastStore.getState().currentDuration).toBe(4000);
		});

		it("bumps the `key` on every new show (forces AnimatePresence remount)", () => {
			useMicroToastStore.getState().show("A", "success");
			const firstKey = useMicroToastStore.getState().key;
			vi.advanceTimersByTime(COALESCE_WINDOW_MS + 100);
			useMicroToastStore.getState().show("B", "info");
			const secondKey = useMicroToastStore.getState().key;
			expect(secondKey).not.toBe(firstKey);
			expect(secondKey).toBeGreaterThan(firstKey);
		});

		it("truncates messages longer than 32 chars with ellipsis", () => {
			const longMessage = "Article ajouté à votre liste de favoris cosy hiver";
			useMicroToastStore.getState().show(longMessage, "success");
			const state = useMicroToastStore.getState();
			expect(state.message.length).toBeLessThanOrEqual(32);
			expect(state.message.endsWith("…")).toBe(true);
		});

		it("keeps short messages intact", () => {
			useMicroToastStore.getState().show("Court", "info");
			expect(useMicroToastStore.getState().message).toBe("Court");
		});

		it("auto-dismisses after the default duration", () => {
			useMicroToastStore.getState().show("Test", "success");
			expect(useMicroToastStore.getState().visible).toBe(true);
			vi.advanceTimersByTime(MICRO_TOAST_DURATION_MS - 1);
			expect(useMicroToastStore.getState().visible).toBe(true);
			vi.advanceTimersByTime(1);
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("respects a custom duration", () => {
			useMicroToastStore.getState().show("Persistant", "warning", 4000);
			vi.advanceTimersByTime(MICRO_TOAST_DURATION_MS + 100);
			expect(useMicroToastStore.getState().visible).toBe(true);
			vi.advanceTimersByTime(4000 - MICRO_TOAST_DURATION_MS - 100);
			expect(useMicroToastStore.getState().visible).toBe(false);
		});
	});

	describe("coalescing (G2)", () => {
		it("increments count when same message+variant within the window", () => {
			useMicroToastStore.getState().show("Ajouté aux favoris", "wishlist");
			const firstKey = useMicroToastStore.getState().key;
			expect(useMicroToastStore.getState().count).toBe(1);

			vi.advanceTimersByTime(200);
			useMicroToastStore.getState().show("Ajouté aux favoris", "wishlist");
			expect(useMicroToastStore.getState().count).toBe(2);
			expect(useMicroToastStore.getState().key).toBe(firstKey);

			vi.advanceTimersByTime(200);
			useMicroToastStore.getState().show("Ajouté aux favoris", "wishlist");
			expect(useMicroToastStore.getState().count).toBe(3);
		});

		it("does NOT coalesce when message differs", () => {
			useMicroToastStore.getState().show("Première", "success");
			vi.advanceTimersByTime(100);
			useMicroToastStore.getState().show("Seconde", "success");
			expect(useMicroToastStore.getState().count).toBe(1);
			expect(useMicroToastStore.getState().message).toBe("Seconde");
		});

		it("does NOT coalesce when variant differs", () => {
			useMicroToastStore.getState().show("Notif", "success");
			vi.advanceTimersByTime(100);
			useMicroToastStore.getState().show("Notif", "warning");
			expect(useMicroToastStore.getState().count).toBe(1);
			expect(useMicroToastStore.getState().variant).toBe("warning");
		});

		it("resets count when re-shown after the dismiss (pastille hidden)", () => {
			useMicroToastStore.getState().show("Notif", "success");
			vi.advanceTimersByTime(MICRO_TOAST_DURATION_MS + 50);
			expect(useMicroToastStore.getState().visible).toBe(false);
			useMicroToastStore.getState().show("Notif", "success");
			expect(useMicroToastStore.getState().count).toBe(1);
		});

		it("restarts the auto-dismiss timer on each coalesce within the window", () => {
			useMicroToastStore.getState().show("Notif", "success");
			vi.advanceTimersByTime(500);
			useMicroToastStore.getState().show("Notif", "success");
			expect(useMicroToastStore.getState().count).toBe(2);
			// Original timer would have fired at t=1200, now extended to t=500+1200=1700
			vi.advanceTimersByTime(700);
			expect(useMicroToastStore.getState().visible).toBe(true);
			vi.advanceTimersByTime(MICRO_TOAST_DURATION_MS);
			expect(useMicroToastStore.getState().visible).toBe(false);
		});
	});

	describe("hide", () => {
		it("hides immediately and clears the pending timer", () => {
			useMicroToastStore.getState().show("Bref", "success");
			useMicroToastStore.getState().hide();
			expect(useMicroToastStore.getState().visible).toBe(false);
			vi.advanceTimersByTime(MICRO_TOAST_DURATION_MS * 2);
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("is a no-op when nothing is visible", () => {
			expect(() => useMicroToastStore.getState().hide()).not.toThrow();
			expect(useMicroToastStore.getState().visible).toBe(false);
		});
	});
});
