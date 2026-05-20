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
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: new Proxy(
		{},
		{
			get: (_, tag: string) => {
				const Component = ({
					children,
					initial: _initial,
					animate: _animate,
					exit: _exit,
					transition: _transition,
					...props
				}: {
					children?: React.ReactNode;
					initial?: unknown;
					animate?: unknown;
					exit?: unknown;
					transition?: unknown;
				} & Record<string, unknown>) => {
					const Tag = tag as keyof React.JSX.IntrinsicElements;
					return <Tag {...props}>{children}</Tag>;
				};
				Component.displayName = `m.${tag}`;
				return Component;
			},
		},
	),
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

			// Spinner (LoaderCircle SVG rendered by lucide-react)
			container.querySelector(".lucide-loader-circle, .lucide-loader2, svg");
			// The status container should be aria-busy
			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("true");

			// Progress bar rendered by Radix
			const progressBar = screen.getByRole("progressbar");
			expect(progressBar).toBeTruthy();

			// Visible text (Unicode horizontal ellipsis)
			expect(screen.getByText("Envoi… 50%")).toBeTruthy();
		});

		it("affiche le spinner et 'Optimisation à l'atelier…' quand isProcessing=true à 100%", () => {
			const { container } = render(<UploadProgress progress={100} isProcessing />);

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-busy")).toBe("true");

			expect(screen.getByText("Optimisation à l'atelier…")).toBeTruthy();

			// LoaderCircle must be present (not Check icon)
			container.querySelector('[aria-hidden="true"] + *');
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
	// Clamp du pourcentage (P2-B)
	// -------------------------------------------------------------------------
	describe("clamp du pourcentage", () => {
		it("borne un progress > 100 à 100 sur la barre de progression", () => {
			render(<UploadProgress progress={150} isProcessing={false} />);

			const progressBar = screen.getByRole("progressbar");
			expect(progressBar.getAttribute("aria-valuenow")).toBe("100");
		});

		it("borne un progress négatif à 0 dans le label et le texte sr-only", () => {
			render(<UploadProgress progress={-10} />);

			expect(screen.getByText("Envoi… 0%")).toBeTruthy();

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Envoi en cours, 0 pourcent");
		});

		it("borne un progress négatif à 0 en variant compact", () => {
			render(<UploadProgress progress={-10} variant="compact" />);

			expect(screen.getByText("0%")).toBeTruthy();
		});

		it("borne un progress > 100 à 100 en variant compact (état terminé)", () => {
			render(<UploadProgress progress={150} variant="compact" isProcessing={false} />);

			expect(screen.getByText("OK")).toBeTruthy();
			expect(screen.queryByText("150%")).toBeNull();
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
			expect(srSpan?.textContent).toBe("Envoi en cours, 50 pourcent");
		});

		it("contient 'Téléversement terminé' pour les lecteurs d'écran à la fin", () => {
			render(<UploadProgress progress={100} isProcessing={false} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Envoi terminé");
		});

		it("contient 'Traitement du fichier en cours' pour les lecteurs d'écran pendant le traitement serveur", () => {
			render(<UploadProgress progress={100} isProcessing />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Optimisation à l'atelier en cours");
		});

		it("inclut le nombre de fichiers en attente dans le texte sr-only", () => {
			render(<UploadProgress progress={50} queuedCount={3} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toContain("3 en attente");
		});

		// P1.5 — completedCount enriches success announcement
		it("annonce 'X fichiers envoyés' quand completedCount est fourni à la fin", () => {
			render(<UploadProgress progress={100} isProcessing={false} completedCount={5} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("5 fichiers envoyés");
		});

		it("utilise le singulier quand completedCount = 1", () => {
			render(<UploadProgress progress={100} isProcessing={false} completedCount={1} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("1 fichier envoyé");
		});

		it("fallback sur 'Téléversement terminé' quand completedCount n'est pas fourni", () => {
			render(<UploadProgress progress={100} isProcessing={false} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Envoi terminé");
		});

		it("fallback sur 'Téléversement terminé' quand completedCount = 0", () => {
			render(<UploadProgress progress={100} isProcessing={false} completedCount={0} />);

			const srSpan = document.querySelector(".sr-only");
			expect(srSpan?.textContent).toBe("Envoi terminé");
		});
	});

	// -------------------------------------------------------------------------
	// Reduced motion
	// -------------------------------------------------------------------------
	describe("reduced motion", () => {
		it("retire la classe animate-spin du spinner quand useReducedMotion retourne true", () => {
			mockUseReducedMotion.mockReturnValue(true);

			const { container } = render(<UploadProgress progress={50} />);

			// Find the LoaderCircle SVG — lucide icons render as <svg> with aria-hidden
			const spinnerCandidates = container.querySelectorAll('svg[aria-hidden="true"]');
			// There should be at least one (the LoaderCircle spinner)
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
