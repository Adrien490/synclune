import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UploadProgress } from "../upload-progress";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockUseReducedMotion } = vi.hoisted(() => ({
	mockUseReducedMotion: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("motion/react", () => ({
	useReducedMotion: mockUseReducedMotion,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UploadProgress", () => {
	beforeEach(() => {
		mockUseReducedMotion.mockReturnValue(false);
	});

	afterEach(() => {
		cleanup();
	});

	// -------------------------------------------------------------------------
	// Variant par défaut
	// -------------------------------------------------------------------------
	describe("variant default", () => {
		it("affiche le spinner, la barre de progression et le texte pendant le téléversement", () => {
			const { container } = render(<UploadProgress progress={50} />);

			// Spinner (Loader2 SVG rendered by lucide-react)
			const loader = container.querySelector(".lucide-loader-circle, .lucide-loader2, svg");
			// The status container should be aria-busy
			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("true");

			// Progress bar rendered by Radix
			const progressBar = screen.getByRole("progressbar");
			expect(progressBar).toBeTruthy();

			// Visible text
			expect(screen.getByText("Téléversement... 50%")).toBeTruthy();
		});

		it("affiche le spinner et 'Traitement...' quand isProcessing=true à 100%", () => {
			const { container } = render(<UploadProgress progress={100} isProcessing />);

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("true");

			expect(screen.getByText("Traitement...")).toBeTruthy();

			// Loader2 must be present (not Check icon)
			const loaderIcon = container.querySelector('[aria-hidden="true"] + *');
			// Check icon wrapper should NOT exist at root level
			const checkIcon = container.querySelector(".text-emerald-600");
			expect(checkIcon).toBeNull();
		});

		it("affiche l'icône de validation et 'Terminé' quand isProcessing=false à 100%", () => {
			render(<UploadProgress progress={100} isProcessing={false} />);

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("false");

			expect(screen.getByText("Terminé")).toBeTruthy();

			// Check icon wrapper should be present (emerald background)
			const checkWrapper = document.querySelector(".bg-emerald-500\\/20");
			expect(checkWrapper).toBeTruthy();
		});

		it("affiche le compteur de file d'attente '+3 en attente' quand queuedCount=3", () => {
			render(<UploadProgress progress={50} queuedCount={3} />);

			expect(screen.getByText("+3 en attente")).toBeTruthy();
		});

		it("n'affiche pas le compteur de file d'attente quand queuedCount=0", () => {
			render(<UploadProgress progress={50} queuedCount={0} />);

			expect(screen.queryByText(/en attente/)).toBeNull();
		});

		it("n'affiche pas le compteur de file d'attente quand le téléversement est terminé", () => {
			render(<UploadProgress progress={100} isProcessing={false} queuedCount={3} />);

			expect(screen.queryByText(/en attente/)).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Variant compact
	// -------------------------------------------------------------------------
	describe("variant compact", () => {
		it("affiche le pourcentage sans barre de progression pendant le téléversement", () => {
			render(<UploadProgress progress={75} variant="compact" />);

			// Percentage label visible
			expect(screen.getByText("75%")).toBeTruthy();

			// No progress bar in compact variant
			expect(screen.queryByRole("progressbar")).toBeNull();
		});

		it("affiche 'OK' et l'icône de validation quand le téléversement est terminé", () => {
			render(<UploadProgress progress={100} variant="compact" />);

			expect(screen.getByText("OK")).toBeTruthy();

			// Check icon wrapper (emerald background)
			const checkWrapper = document.querySelector(".bg-emerald-500\\/20");
			expect(checkWrapper).toBeTruthy();
		});

		it("marque aria-busy='true' pendant le téléversement", () => {
			render(<UploadProgress progress={75} variant="compact" />);

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("true");
		});

		it("marque aria-busy='false' quand le téléversement est terminé", () => {
			render(<UploadProgress progress={100} isProcessing={false} variant="compact" />);

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("false");
		});
	});

	// -------------------------------------------------------------------------
	// Accessibilité — texte pour lecteurs d'écran
	// -------------------------------------------------------------------------
	describe("texte sr-only", () => {
		it("contient le texte de progression pour les lecteurs d'écran pendant le téléversement", () => {
			render(<UploadProgress progress={50} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Téléversement en cours, 50 pourcent");
		});

		it("contient 'Téléversement terminé' pour les lecteurs d'écran à la fin", () => {
			render(<UploadProgress progress={100} isProcessing={false} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Téléversement terminé");
		});

		it("contient 'Traitement du fichier en cours' pour les lecteurs d'écran pendant le traitement serveur", () => {
			render(<UploadProgress progress={100} isProcessing />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Traitement du fichier en cours");
		});

		it("inclut le nombre de fichiers en attente dans le texte sr-only", () => {
			render(<UploadProgress progress={50} queuedCount={3} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toContain("3 en attente");
		});
	});

	// -------------------------------------------------------------------------
	// Reduced motion
	// -------------------------------------------------------------------------
	describe("reduced motion", () => {
		it("retire la classe animate-spin du spinner quand useReducedMotion retourne true", () => {
			mockUseReducedMotion.mockReturnValue(true);

			const { container } = render(<UploadProgress progress={50} />);

			// Find the Loader2 SVG — lucide icons render as <svg> with aria-hidden
			const spinnerCandidates = container.querySelectorAll('svg[aria-hidden="true"]');
			// There should be at least one (the Loader2 spinner)
			expect(spinnerCandidates.length).toBeGreaterThan(0);

			// None of the aria-hidden SVGs should have animate-spin
			spinnerCandidates.forEach((el) => {
				expect(el.classList.contains("animate-spin")).toBe(false);
			});
		});

		it("conserve la classe animate-spin du spinner quand useReducedMotion retourne false", () => {
			mockUseReducedMotion.mockReturnValue(false);

			const { container } = render(<UploadProgress progress={50} />);

			const spinnerCandidates = container.querySelectorAll('svg[aria-hidden="true"]');
			expect(spinnerCandidates.length).toBeGreaterThan(0);

			// At least one spinner should have animate-spin
			const hasAnimateSpin = Array.from(spinnerCandidates).some((el) =>
				el.classList.contains("animate-spin"),
			);
			expect(hasAnimateSpin).toBe(true);
		});
	});
});
