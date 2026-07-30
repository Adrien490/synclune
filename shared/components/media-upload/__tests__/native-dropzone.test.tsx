/**
 * `NativeDropzone` n'avait aucun test propre : ni le clic, ni le drag&drop, ni la
 * remise à zéro de l'input, ni l'`accept` — alors qu'elle remplace
 * `UploadDropzone` d'UploadThing et porte donc tout le chemin desktop.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { ACCEPT_ATTRIBUTE_CATALOG } from "@/modules/media/constants/media-limits.constants";
import { NativeDropzone } from "../native-dropzone";

afterEach(cleanup);

function makeDataTransfer(files: File[], types: string[] = ["Files"]) {
	return { files, types, dropEffect: "none" } as unknown as DataTransfer;
}

const IMAGE = new File([""], "bague.jpg", { type: "image/jpeg" });

describe("sélection par clic et clavier", () => {
	it("ouvre le sélecteur UNE seule fois par clic", () => {
		// ⚠️ Régression trouvée en écrivant ce test : l'`<input>` caché étant un enfant
		// de la zone, son clic programmatique remontait jusqu'au `onClick` du parent,
		// qui re-cliquait l'input — le sélecteur de fichiers s'ouvrait deux fois.
		// Ce composant n'avait aucun test, personne ne l'avait vu.
		render(<NativeDropzone onFiles={vi.fn()} />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
		const clickSpy = vi.spyOn(input, "click");

		fireEvent.click(screen.getByRole("button"));

		expect(clickSpy).toHaveBeenCalledTimes(1);
	});

	it("s'active à Entrée et à Espace", () => {
		render(<NativeDropzone onFiles={vi.fn()} />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
		const clickSpy = vi.spyOn(input, "click");
		const zone = screen.getByRole("button");

		fireEvent.keyDown(zone, { key: "Enter" });
		fireEvent.keyDown(zone, { key: " " });

		expect(clickSpy).toHaveBeenCalledTimes(2);
	});

	it("réarme l'input après sélection", () => {
		const onFiles = vi.fn();
		render(<NativeDropzone onFiles={onFiles} />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

		Object.defineProperty(input, "files", { value: [IMAGE], configurable: true });
		fireEvent.change(input);

		expect(onFiles).toHaveBeenCalledWith([IMAGE]);
		// Sans remise à zéro, re-choisir le MÊME fichier n'émet plus d'événement.
		expect(input.value).toBe("");
	});

	it("ne fait rien quand elle est désactivée", () => {
		render(<NativeDropzone onFiles={vi.fn()} disabled />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
		const clickSpy = vi.spyOn(input, "click");
		const zone = screen.getByRole("button");

		fireEvent.click(zone);
		fireEvent.keyDown(zone, { key: "Enter" });

		expect(clickSpy).not.toHaveBeenCalled();
		expect(zone).toHaveAttribute("aria-disabled", "true");
		expect(zone).toHaveAttribute("tabindex", "-1");
	});
});

describe("glisser-déposer", () => {
	it("remonte les fichiers déposés", () => {
		const onFiles = vi.fn();
		render(<NativeDropzone onFiles={onFiles} />);

		fireEvent.drop(screen.getByRole("button"), { dataTransfer: makeDataTransfer([IMAGE]) });

		expect(onFiles).toHaveBeenCalledWith([IMAGE]);
	});

	it("bascule l'étiquette pendant le survol d'un fichier", () => {
		render(<NativeDropzone onFiles={vi.fn()} primaryLabel="Glissez ici" dropLabel="Relâchez !" />);
		const zone = screen.getByRole("button");

		expect(screen.getByText("Glissez ici")).toBeInTheDocument();
		fireEvent.dragOver(zone, { dataTransfer: makeDataTransfer([IMAGE]) });
		expect(screen.getByText("Relâchez !")).toBeInTheDocument();
	});

	it("ignore un survol qui ne transporte pas de fichier", () => {
		// Une sélection de texte glissée depuis la page ne doit pas faire clignoter la
		// zone en cible de dépôt.
		render(<NativeDropzone onFiles={vi.fn()} primaryLabel="Glissez ici" dropLabel="Relâchez !" />);

		fireEvent.dragOver(screen.getByRole("button"), {
			dataTransfer: makeDataTransfer([], ["text/plain"]),
		});

		expect(screen.getByText("Glissez ici")).toBeInTheDocument();
	});

	it("n'appelle pas onFiles sur un dépôt vide", () => {
		const onFiles = vi.fn();
		render(<NativeDropzone onFiles={onFiles} />);

		fireEvent.drop(screen.getByRole("button"), { dataTransfer: makeDataTransfer([]) });

		expect(onFiles).not.toHaveBeenCalled();
	});

	it("refuse le dépôt quand elle est désactivée", () => {
		const onFiles = vi.fn();
		render(<NativeDropzone onFiles={onFiles} disabled />);

		fireEvent.drop(screen.getByRole("button"), { dataTransfer: makeDataTransfer([IMAGE]) });

		expect(onFiles).not.toHaveBeenCalled();
	});
});

describe("attribut accept", () => {
	it("utilise la SSOT catalogue par défaut, sans joker", () => {
		render(<NativeDropzone onFiles={vi.fn()} />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

		expect(input.accept).toBe(ACCEPT_ATTRIBUTE_CATALOG);
		// ⚠️ `image/*,video/*` laissait le picker proposer `.mov` et `.svg`, refusés
		// côté serveur après un téléversement complet.
		expect(input.accept).not.toContain("*");
	});

	it("ne duplique plus les extensions HEIC", () => {
		// Le composant les ajoutait lui-même en plus de l'`accept` reçu ; elles sont
		// désormais dans la SSOT, donc présentes exactement une fois.
		render(<NativeDropzone onFiles={vi.fn()} />);
		const accept = document.querySelector<HTMLInputElement>('input[type="file"]')!.accept;

		expect(accept.split(",").filter((t) => t.trim() === ".heic")).toHaveLength(1);
	});
});

describe("collage", () => {
	it("n'installe aucun listener de collage", () => {
		// ⚠️ Le listage `paste` appartient désormais à la surface
		// (`useWindowPasteFiles`). Porté ici, il était enregistré deux fois dès qu'une
		// surface montait ses branches mobile et desktop ensemble, et chaque fichier
		// collé arrivait en double.
		const addSpy = vi.spyOn(window, "addEventListener");
		render(<NativeDropzone onFiles={vi.fn()} />);

		expect(addSpy.mock.calls.filter((call) => String(call[0]) === "paste")).toHaveLength(0);
		addSpy.mockRestore();
	});
});

describe("accessibilité", () => {
	it("expose un rôle bouton et une étiquette", () => {
		render(<NativeDropzone onFiles={vi.fn()} ariaLabel="Zone d'upload des médias" />);

		expect(screen.getByRole("button", { name: "Zone d'upload des médias" })).toBeInTheDocument();
	});

	it("garde l'input hors du parcours clavier", () => {
		// La zone entière est le contrôle : un input focusable en plus créerait un
		// second arrêt de tabulation sans étiquette.
		render(<NativeDropzone onFiles={vi.fn()} />);
		const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

		expect(input).toHaveAttribute("tabindex", "-1");
		expect(input).toHaveAttribute("aria-hidden", "true");
	});
});
