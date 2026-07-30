/**
 * `UploadActionSheet` n'avait aucun test propre — donc rien ne couvrait ni les trois
 * sources de fichiers, ni le **clic synchrone iOS**, ni la bascule mobile/desktop.
 *
 * Le clic synchrone est une régression silencieuse par nature : différer
 * `input.click()` hors du tick du geste utilisateur fait que Safari iOS < 17
 * n'ouvre simplement pas le sélecteur, sans erreur. Rien ne le signale, ni au
 * build, ni au typecheck, ni à l'exécution sur desktop.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	ACCEPT_ATTRIBUTE_CATALOG,
	ACCEPT_ATTRIBUTE_IMAGES_ONLY,
} from "@/modules/media/constants/media-limits.constants";
import { UploadActionSheet } from "../upload-action-sheet";

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => undefined,
	triggerHaptic: () => undefined,
}));

// Vaul monte un portail et anime : on le réduit à sa structure pour pouvoir
// atteindre les trois boutons de source sans piloter d'animation.
vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function setup(props: Partial<React.ComponentProps<typeof UploadActionSheet>> = {}) {
	const onFilesSelected = vi.fn();
	render(<UploadActionSheet onFilesSelected={onFilesSelected} {...props} />);
	return { onFilesSelected };
}

describe("sources de fichiers", () => {
	it("propose les trois sources quand la caméra est activée", () => {
		setup({ showCamera: true });

		expect(screen.getByText("Capturer un cliché")).toBeInTheDocument();
		expect(screen.getByText("Depuis la pellicule")).toBeInTheDocument();
		expect(screen.getByText("Parcourir mes fichiers")).toBeInTheDocument();
	});

	it("masque la capture quand elle n'a pas de sens pour le flux", () => {
		setup({ showCamera: false });

		expect(screen.queryByText("Capturer un cliché")).not.toBeInTheDocument();
		expect(screen.getByText("Depuis la pellicule")).toBeInTheDocument();
	});

	it("remonte les fichiers choisis puis réarme l'input", () => {
		const { onFilesSelected } = setup();
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
		const file = new File([""], "bague.jpg", { type: "image/jpeg" });

		Object.defineProperty(input, "files", { value: [file], configurable: true });
		fireEvent.change(input);

		expect(onFilesSelected).toHaveBeenCalledWith([file]);
		// Sans remise à zéro, re-choisir le MÊME fichier n'émettrait plus d'événement.
		expect(input.value).toBe("");
	});
});

describe("clic synchrone iOS", () => {
	it("clique l'input dans le tick du geste, avant toute fermeture", () => {
		setup({ showCamera: true });

		const cameraInput = document.querySelector<HTMLInputElement>('input[capture="environment"]')!;
		const clickSpy = vi.spyOn(cameraInput, "click");

		fireEvent.click(screen.getByText("Capturer un cliché"));

		// ⚠️ Doit être appelé de façon SYNCHRONE pendant le gestionnaire de clic.
		// Différer via rAF / setTimeout / await fait perdre le « user gesture » à
		// Safari iOS < 17, et le sélecteur ne s'ouvre pas — sans aucune erreur.
		expect(clickSpy).toHaveBeenCalledTimes(1);
	});

	it("relie chaque source à son propre input", () => {
		setup({ showCamera: true });

		const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
		expect(inputs).toHaveLength(3);

		const spies = inputs.map((i) => vi.spyOn(i, "click"));
		fireEvent.click(screen.getByText("Depuis la pellicule"));

		// Exactement un input cliqué — pas zéro, pas deux.
		expect(spies.filter((s) => s.mock.calls.length > 0)).toHaveLength(1);
	});
});

describe("bascule mobile / desktop", () => {
	it("rend les DEUX branches et les gate en CSS, jamais en JS", () => {
		// ⚠️ La bascule passait par `useIsMobile()`, dont le fallback SSR vaut
		// « desktop » : sur téléphone, le premier paint rendait la zone de dépôt
		// desktop avant de la remplacer. Les deux branches doivent coexister dans le
		// DOM, la visibilité étant décidée par la media query seule.
		const { container } = render(
			<UploadActionSheet
				onFilesSelected={vi.fn()}
				desktopFallback={<div data-testid="desktop-zone">Glissez vos fichiers</div>}
			/>,
		);

		expect(screen.getByTestId("desktop-zone")).toBeInTheDocument();
		expect(screen.getByText("Ajouter une photo")).toBeInTheDocument();

		expect(container.querySelector(".hidden.md\\:block")).not.toBeNull();
		expect(container.querySelector(".contents.md\\:hidden")).not.toBeNull();
	});

	it("n'importe aucun hook de largeur d'écran", () => {
		// Garde-fou du garde-fou : si le hook de largeur revenait dans ce composant, la
		// bascule redeviendrait dépendante de l'hydratation sans que les assertions
		// ci-dessus ne bougent.
		//
		// L'assertion porte sur l'IMPORT et non sur le nom du hook : le docblock du
		// composant explique justement pourquoi il ne l'utilise plus, et une recherche
		// naïve de la chaîne se déclencherait sur ce commentaire.
		const source = readFileSync(
			resolve(process.cwd(), "shared/components/media-upload/upload-action-sheet.tsx"),
			"utf-8",
		);
		expect(source).not.toMatch(/^import .*use-mobile/m);
	});
});

describe("attribut accept", () => {
	it("par défaut, celui des surfaces images seules (aucun joker)", () => {
		setup();
		const input = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;

		expect(input.accept).toBe(ACCEPT_ATTRIBUTE_IMAGES_ONLY);
		expect(input.accept).not.toContain("*");
	});

	it("propage l'accept catalogue aux sélecteurs de fichiers", () => {
		setup({ accept: ACCEPT_ATTRIBUTE_CATALOG, showCamera: true });

		const pickers = document.querySelectorAll<HTMLInputElement>(
			'input[type="file"]:not([capture])',
		);
		expect(pickers).toHaveLength(2); // pellicule + fichiers
		for (const input of pickers) {
			expect(input.accept).toBe(ACCEPT_ATTRIBUTE_CATALOG);
		}
	});

	it("restreint la capture caméra aux images, même sur une surface qui accepte la vidéo", () => {
		// Le bouton promet « Capturer un cliché ». Avec un `accept` incluant la vidéo,
		// `capture="environment"` laisse iOS proposer l'enregistrement vidéo, et
		// l'utilisatrice obtient une vidéo là où le libellé annonçait une photo.
		setup({ accept: ACCEPT_ATTRIBUTE_CATALOG, showCamera: true });

		const camera = document.querySelector<HTMLInputElement>('input[capture="environment"]')!;
		expect(camera.accept).toBe(ACCEPT_ATTRIBUTE_IMAGES_ONLY);
		expect(camera.accept).not.toContain("video/");
	});

	it("n'installe aucun listener de collage (il appartient à la surface)", () => {
		// Les deux branches étant montées ensemble, un listener `window` porté ici
		// serait enregistré deux fois et chaque fichier collé arriverait en double.
		const addSpy = vi.spyOn(window, "addEventListener");
		setup();

		expect(addSpy.mock.calls.filter((call) => String(call[0]) === "paste")).toHaveLength(0);
		addSpy.mockRestore();
	});
});
