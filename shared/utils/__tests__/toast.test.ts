import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSonner, mockHaptic } = vi.hoisted(() => ({
	mockSonner: {
		success: vi.fn().mockReturnValue("toast-id-1"),
		error: vi.fn().mockReturnValue("toast-id-2"),
		warning: vi.fn().mockReturnValue("toast-id-3"),
		info: vi.fn().mockReturnValue("toast-id-4"),
		message: vi.fn().mockReturnValue("toast-id-5"),
		loading: vi.fn().mockReturnValue("toast-id-6"),
		dismiss: vi.fn(),
		promise: vi.fn(),
		custom: vi.fn(),
	},
	mockHaptic: vi.fn().mockReturnValue(true),
}));

vi.mock("sonner", () => ({ toast: mockSonner }));
vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockHaptic }));

import {
	toast,
	sanitizeErrorMessage,
	GENERIC_ERROR_MESSAGE,
	computeDuration,
	__resetDesktopCoalesce,
} from "../toast";
import { useMicroToastStore } from "@/shared/stores/micro-toast-store";

beforeEach(() => {
	vi.clearAllMocks();
	// Évite la contamination inter-tests via le cache de dédup desktop (Date.now réel).
	__resetDesktopCoalesce();
});

describe("sanitizeErrorMessage", () => {
	it("returns generic message for empty string", () => {
		expect(sanitizeErrorMessage("")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("passes through clean FR user-facing messages", () => {
		expect(sanitizeErrorMessage("Impossible de copier dans le presse-papiers")).toBe(
			"Impossible de copier dans le presse-papiers",
		);
		expect(sanitizeErrorMessage("Veuillez sélectionner au moins un bijou.")).toBe(
			"Veuillez sélectionner au moins un bijou.",
		);
		expect(sanitizeErrorMessage("Erreur lors de la création du produit")).toBe(
			"Erreur lors de la création du produit",
		);
	});

	it("sanitizes Prisma error codes", () => {
		expect(sanitizeErrorMessage("P2002: unique constraint failed")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("Erreur: prisma client not initialized")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
	});

	it("sanitizes fetch/network errors", () => {
		expect(sanitizeErrorMessage("fetch failed")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("NetworkError when attempting to fetch resource")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
		expect(sanitizeErrorMessage("network error")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes JS runtime errors", () => {
		expect(sanitizeErrorMessage("TypeError: foo is not a function")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("Cannot read properties of undefined (reading 'id')")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
		expect(sanitizeErrorMessage("undefined is not an object")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes node-level connection errors", () => {
		expect(sanitizeErrorMessage("ECONNREFUSED 127.0.0.1:5432")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("ETIMEDOUT connecting to upstream")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes stack trace fragments", () => {
		expect(sanitizeErrorMessage("at anonymous (app.js:10:5)")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes overly long messages", () => {
		const long = "A".repeat(300);
		expect(sanitizeErrorMessage(long)).toBe(GENERIC_ERROR_MESSAGE);
	});
});

describe("computeDuration", () => {
	it("respects MIN_DURATION floor per type", () => {
		// "Bijou créé" = 2 mots = ~800ms+500 = 1300 → floor success=2000
		expect(computeDuration("Bijou créé", "success")).toBe(2000);
		// Short error → floor error=5000
		expect(computeDuration("Erreur", "error")).toBe(5000);
		// Short warning → floor warning=4000
		expect(computeDuration("Stop", "warning")).toBe(4000);
	});

	it("scales up for long messages (WPS-based)", () => {
		// 12 mots / 2.5 = 4.8s → 4800+500 = 5300 (dépasse floor success 2000)
		const twelveWords = "Votre commande a bien été prise en compte et sera expédiée demain matin";
		const result = computeDuration(twelveWords, "success");
		expect(result).toBeGreaterThanOrEqual(5300);
	});

	it("returns floor for non-string messages", () => {
		expect(computeDuration(null, "success")).toBe(2000);
		expect(computeDuration(undefined, "error")).toBe(5000);
		expect(computeDuration({ jsx: true }, "info")).toBe(2500);
	});

	it("returns floor for empty string", () => {
		expect(computeDuration("", "warning")).toBe(4000);
	});
});

describe("toast wrapper", () => {
	describe("success", () => {
		it("triggers success haptic and forwards to sonner with computed duration", () => {
			toast.success("Bijou créé");

			expect(mockHaptic).toHaveBeenCalledWith("success");
			expect(mockSonner.success).toHaveBeenCalledWith(
				"Bijou créé",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("caller duration overrides computed duration", () => {
			const action = { label: "Voir", onClick: vi.fn() };
			toast.success("Ajouté", { action, duration: 5000 });

			expect(mockSonner.success).toHaveBeenCalledWith("Ajouté", {
				action,
				duration: 5000,
			});
		});
	});

	describe("error", () => {
		it("triggers error haptic", () => {
			toast.error("Erreur");

			expect(mockHaptic).toHaveBeenCalledWith("error");
		});

		it("passes clean FR message through with error duration floor", () => {
			toast.error("Impossible de charger la page");

			expect(mockSonner.error).toHaveBeenCalledWith(
				"Impossible de charger la page",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("sanitizes technical error messages", () => {
			toast.error("Erreur: Prisma connection failed (P2002)");

			expect(mockSonner.error).toHaveBeenCalledWith(
				GENERIC_ERROR_MESSAGE,
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("sanitizes TypeError messages", () => {
			toast.error("TypeError: Cannot read properties of undefined");

			expect(mockSonner.error).toHaveBeenCalledWith(
				GENERIC_ERROR_MESSAGE,
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("dismisses pending non-error toast (priority lane)", () => {
			mockSonner.success.mockReturnValueOnce("success-id-42");
			toast.success("Bijou ajouté");
			toast.error("Stock insuffisant");

			expect(mockSonner.dismiss).toHaveBeenCalledWith("success-id-42");
		});

		it("passes through non-string messages unchanged (ReactNode)", () => {
			const node = "react-node-placeholder";
			toast.error(node);

			expect(mockSonner.error).toHaveBeenCalled();
		});
	});

	describe("warning", () => {
		it("triggers medium haptic and forwards message with warning duration floor", () => {
			toast.warning("Attention");

			expect(mockHaptic).toHaveBeenCalledWith("medium");
			expect(mockSonner.warning).toHaveBeenCalledWith(
				"Attention",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});
	});

	describe("info", () => {
		it("does not trigger haptic, forwards with info duration floor", () => {
			toast.info("Info");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.info).toHaveBeenCalledWith(
				"Info",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});
	});

	describe("pass-through methods (no haptic, no duration override)", () => {
		it("loading() does not trigger haptic or duration", () => {
			toast.loading("Chargement…");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.loading).toHaveBeenCalledWith("Chargement…");
		});

		it("dismiss() forwards id", () => {
			toast.dismiss("toast-id-1");

			expect(mockSonner.dismiss).toHaveBeenCalledWith("toast-id-1");
		});
	});

	describe("screen reader announcer", () => {
		it("updates sr-only polite region on success (after rAF)", async () => {
			const polite = document.createElement("div");
			polite.id = "toast-live-polite";
			document.body.appendChild(polite);

			toast.success("Bijou ajouté");
			await new Promise((r) => requestAnimationFrame(r));

			expect(polite.textContent).toBe("Bijou ajouté");
			polite.remove();
		});

		it("updates sr-only assertive region on error (sanitized)", async () => {
			const assertive = document.createElement("div");
			assertive.id = "toast-live-assertive";
			document.body.appendChild(assertive);

			toast.error("TypeError: boom");
			await new Promise((r) => requestAnimationFrame(r));

			expect(assertive.textContent).toBe(GENERIC_ERROR_MESSAGE);
			assertive.remove();
		});
	});

	describe("return value", () => {
		it("returns sonner toast id for success", () => {
			expect(toast.success("ok")).toBe("toast-id-1");
		});

		it("returns sonner toast id for error", () => {
			expect(toast.error("fail")).toBe("toast-id-2");
		});
	});

	describe("mobile viewport — skip loading toasts", () => {
		const stubMatchMedia = (matches: boolean) => {
			vi.stubGlobal(
				"matchMedia",
				vi.fn().mockReturnValue({
					matches,
					media: "(max-width: 767px)",
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				}),
			);
			window.matchMedia = globalThis.matchMedia;
		};

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("loading() shows a persistent loading pastille and returns a truthy ref on mobile", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({
				visible: false,
				message: "",
				variant: "success",
				action: null,
			});

			const ref = toast.loading("Chargement…");

			// Référence truthy (withCallbacks n'appelle onEnd que si onStart renvoie truthy).
			expect(ref).toBeTruthy();
			expect(mockSonner.loading).not.toHaveBeenCalled();
			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.variant).toBe("loading");
			expect(state.message).toBe("Chargement…");
		});

		it("dismiss(loadingRef) is a no-op on mobile (terminal toast morphs the pastille)", () => {
			stubMatchMedia(true);
			const ref = toast.loading("Chargement…");
			toast.dismiss(ref);
			// Ni forward Sonner, ni fermeture : la pastille loading reste visible.
			expect(mockSonner.dismiss).not.toHaveBeenCalled();
			expect(useMicroToastStore.getState().visible).toBe(true);
			expect(useMicroToastStore.getState().variant).toBe("loading");
		});

		it("loading() forwards to sonner on desktop", () => {
			stubMatchMedia(false);
			toast.loading("Chargement…");
			expect(mockSonner.loading).toHaveBeenCalledWith("Chargement…");
		});

		it("promise() resolves manually with toast.success on mobile (no sonner.promise)", async () => {
			stubMatchMedia(true);
			const p = Promise.resolve("data");
			toast.promise(p, { loading: "Chargement…", success: "Réussi", error: "Échec" });
			await p;
			await Promise.resolve();
			expect(mockSonner.promise).not.toHaveBeenCalled();
			// Sur mobile, `toast.success` ne route plus vers Sonner mais vers
			// <MicroToast /> (cf shared/stores/micro-toast-store). On vérifie
			// seulement que sonner.promise ET sonner.success ne sont PAS appelés.
			expect(mockSonner.success).not.toHaveBeenCalled();
		});

		it("promise() shows a loading pastille that morphs in place to success on mobile", async () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({
				visible: false,
				message: "",
				variant: "success",
				action: null,
			});

			const p = Promise.resolve("data");
			toast.promise(p, { loading: "Chargement…", success: "Réussi", error: "Échec" });

			// Pendant la promesse : pastille loading visible.
			let state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.variant).toBe("loading");
			const loadingKey = state.key;

			await p;
			await Promise.resolve();

			// Après résolution : morph in-place (même key) vers success.
			state = useMicroToastStore.getState();
			expect(state.variant).toBe("success");
			expect(state.message).toBe("Réussi");
			expect(state.key).toBe(loadingKey);
			expect(mockSonner.promise).not.toHaveBeenCalled();
		});

		it("promise() hides the loading pastille when no terminal message is provided on mobile", async () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({
				visible: false,
				message: "",
				variant: "success",
				action: null,
			});

			const p = Promise.resolve("data");
			toast.promise(p, { loading: "Chargement…" });
			expect(useMicroToastStore.getState().visible).toBe(true);

			await p;
			await Promise.resolve();

			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("promise() rejects manually with toast.error on mobile (routes to MicroToast, function error msg)", async () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({
				visible: false,
				message: "",
				variant: "success",
				action: null,
			});
			const p = Promise.reject(new Error("boom"));
			toast.promise(p, {
				loading: "Chargement…",
				success: "OK",
				error: (e: unknown) => (e instanceof Error ? e.message : "fail"),
			});
			await p.catch(() => {});
			await Promise.resolve();
			expect(mockSonner.promise).not.toHaveBeenCalled();
			// F1 : error sur mobile route vers la pastille MicroToast, pas Sonner.
			expect(mockSonner.error).not.toHaveBeenCalled();
			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.variant).toBe("error");
			expect(state.message).toBe("boom");
		});

		it("promise() forwards to sonner on desktop", () => {
			stubMatchMedia(false);
			const p = Promise.resolve("data");
			toast.promise(p, { loading: "Chargement…", success: "Réussi", error: "Échec" });
			expect(mockSonner.promise).toHaveBeenCalled();
		});

		it("success() on mobile passes computeDuration to MicroToast store (not default 1200ms)", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({ visible: false, message: "", currentDuration: 0, count: 1 });
			const longMessage = "Nouveau bijou « Bague Saphir » dans l'atelier — publié";

			toast.success(longMessage);

			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.message).toContain("Nouveau bijou");
			// computeDuration(8 mots, success) ≈ 3700ms, en tout cas > floor 2000
			expect(state.currentDuration).toBe(computeDuration(longMessage, "success"));
			expect(state.currentDuration).toBeGreaterThan(2000);
		});

		it("success() on mobile honors caller-provided duration override", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({ visible: false, message: "", currentDuration: 0, count: 1 });

			toast.success("Bijou créé", { duration: 800 });

			expect(useMicroToastStore.getState().currentDuration).toBe(800);
		});

		it("error() on mobile routes to MicroToast (variant error) instead of Sonner (F1)", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({
				visible: false,
				message: "",
				variant: "success",
				currentDuration: 0,
				count: 1,
				action: null,
			});

			toast.error("Stock insuffisant");

			expect(mockSonner.error).not.toHaveBeenCalled();
			const state = useMicroToastStore.getState();
			expect(state.visible).toBe(true);
			expect(state.variant).toBe("error");
			expect(state.message).toBe("Stock insuffisant");
			// floor erreur = 5000
			expect(state.currentDuration).toBeGreaterThanOrEqual(5000);
		});

		it("error() on mobile sanitizes technical messages before showing the pastille", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({ visible: false, message: "", action: null });

			toast.error("TypeError: boom at app.js:1");

			expect(useMicroToastStore.getState().message).toBe(GENERIC_ERROR_MESSAGE);
		});

		it("success() on mobile propagates the action to the pastille (F5)", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({ visible: false, message: "", action: null });
			const onClick = vi.fn();

			toast.success("Archivé", { action: { label: "Annuler", onClick } });

			const { action } = useMicroToastStore.getState();
			expect(action).not.toBeNull();
			expect(action?.label).toBe("Annuler");
			action?.onClick();
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it("action on mobile extends the duration to at least 6000ms (time to tap)", () => {
			stubMatchMedia(true);
			useMicroToastStore.setState({ visible: false, message: "", action: null });

			toast.success("OK", { action: { label: "Annuler", onClick: vi.fn() } });

			expect(useMicroToastStore.getState().currentDuration).toBeGreaterThanOrEqual(6000);
		});
	});

	describe("desktop coalescing (F4)", () => {
		it("passes a stable id derived from (variant, message) so Sonner refreshes instead of stacking", () => {
			toast.success("Ajouté au panier");
			expect(mockSonner.success).toHaveBeenCalledWith(
				"Ajouté au panier",
				expect.objectContaining({ id: "coalesce:success::Ajouté au panier" }),
			);
		});

		it("suffixes ×N on the message when the same toast repeats within the window", () => {
			toast.success("Ajouté au panier");
			toast.success("Ajouté au panier");
			toast.success("Ajouté au panier");
			expect(mockSonner.success).toHaveBeenLastCalledWith(
				"Ajouté au panier ×3",
				expect.objectContaining({ id: "coalesce:success::Ajouté au panier" }),
			);
		});

		it("does NOT dedup when the caller provides an explicit action (undo)", () => {
			const action = { label: "Annuler", onClick: vi.fn() };
			toast.success("Article supprimé", { action });
			const call = mockSonner.success.mock.calls[0];
			expect(call?.[1]).not.toHaveProperty("id");
		});

		it("does NOT dedup when the caller provides an explicit id", () => {
			toast.success("Sauvegardé", { id: "custom-id" });
			expect(mockSonner.success).toHaveBeenCalledWith(
				"Sauvegardé",
				expect.objectContaining({ id: "custom-id" }),
			);
		});
	});
});
