/**
 * @regression upload-progress-derived-from-bytes
 *
 * Audit UI/UX file upload — la barre de progression n'avait que **deux états**, 0 %
 * et 100 %, pour tout upload d'images.
 *
 * `progressPercent()` calculait `completed / total`, un compte de FICHIERS. Or
 * `uploadImages()` envoie tout le lot dans un seul `startUpload()` et n'incrémente
 * `completed` qu'après : la barre restait donc figée à 0 pendant tout l'envoi, quel
 * que soit le nombre de fichiers, puis sautait à 100.
 *
 * Pendant ce temps `onUploadProgress` alimentait correctement
 * `bytesUploaded` / `bytesTotal` / `bytesPerSecond` / `etaSeconds` — qui ne
 * pilotaient que les libellés secondaires. L'écran affichait donc simultanément
 * « Envoi… 0 % » et « 5,6 Mo / 12,0 Mo · Reste 8s », deux informations
 * contradictoires côte à côte. Et côté lecteur d'écran, `nearestMilestone(0)`
 * valant 0, les paliers 0/25/50/75/100 étaient inertes : l'utilisatrice
 * n'entendait que « Envoi en cours, 0 pourcent » jusqu'à la fin.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { progressPercent } from "@/modules/media/utils/upload-helpers";
import { UploadProgress } from "../upload-progress";

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: { p: ({ children, ...props }: React.ComponentProps<"p">) => <p {...props}>{children}</p> },
	useReducedMotion: () => true,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => undefined,
	triggerHaptic: () => undefined,
}));

const MO = 1024 * 1024;

afterEach(cleanup);

describe("progressPercent — source de vérité du pourcentage", () => {
	it("dérive des octets même quand aucun fichier n'est encore terminé", () => {
		// Le cas exact du bug : un seul fichier, à mi-parcours.
		expect(
			progressPercent({ completed: 0, total: 1, bytesUploaded: 5.6 * MO, bytesTotal: 12 * MO }),
		).toBe(47);
	});

	it("dérive des octets sur un lot d'images envoyé d'un bloc", () => {
		// 6 images, `completed` reste à 0 jusqu'au bout : sans les octets, 0 %.
		expect(
			progressPercent({ completed: 0, total: 6, bytesUploaded: 4.5 * MO, bytesTotal: 18 * MO }),
		).toBe(25);
	});

	it("ne retombe sur le compte de fichiers qu'en l'absence d'octets", () => {
		expect(progressPercent({ completed: 2, total: 4 })).toBe(50);
		expect(progressPercent({ completed: 2, total: 4, bytesTotal: 0 })).toBe(50);
	});
});

describe("UploadProgress — cohérence entre la barre et les libellés", () => {
	it("affiche le même pourcentage que celui dérivé des octets", () => {
		const progress = { completed: 0, total: 1, bytesUploaded: 5.6 * MO, bytesTotal: 12 * MO };

		render(
			<UploadProgress
				progress={progressPercent(progress)}
				phase="uploading"
				bytesUploaded={progress.bytesUploaded}
				bytesTotal={progress.bytesTotal}
			/>,
		);

		// La barre porte la valeur dérivée des octets…
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "47");
		// …et le libellé visible dit la même chose que le compteur d'octets.
		expect(screen.getByText(/Envoi… 47 ?%/)).toBeInTheDocument();
		// Virgule décimale française (« 5,6 Mo »), pas le point anglophone —
		// cf. formatBytesShort, aligné sur CLAUDE.md § Conventions.
		expect(screen.getByText(/5,6 Mo \/ 12,0 Mo/)).toBeInTheDocument();
	});

	it("annonce un palier non nul au lecteur d'écran en cours d'envoi", () => {
		// ⚠️ C'est la moitié la plus silencieuse du bug : avec un pourcentage bloqué à
		// 0, `nearestMilestone` renvoyait toujours 0 et la région live ne disait jamais
		// rien d'autre que « 0 pourcent » du début à la fin de l'upload.
		const progress = { completed: 0, total: 1, bytesUploaded: 9 * MO, bytesTotal: 12 * MO };

		render(
			<UploadProgress
				progress={progressPercent(progress)}
				phase="uploading"
				bytesUploaded={progress.bytesUploaded}
				bytesTotal={progress.bytesTotal}
			/>,
		);

		const liveRegion = screen.getByRole("status");
		expect(liveRegion).toHaveTextContent(/75 pourcent/);
		expect(liveRegion).not.toHaveTextContent(/0 pourcent/);
	});
});
