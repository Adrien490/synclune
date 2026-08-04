import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
} from "../attachment";

afterEach(cleanup);

describe("Attachment", () => {
	it("expose état, taille et orientation en attributs data-*", () => {
		const { container } = render(
			<Attachment state="uploading" size="xs" orientation="vertical">
				<AttachmentContent>
					<AttachmentTitle>rapport.pdf</AttachmentTitle>
				</AttachmentContent>
			</Attachment>,
		);

		const root = container.querySelector('[data-slot="attachment"]');
		expect(root?.getAttribute("data-state")).toBe("uploading");
		expect(root?.getAttribute("data-size")).toBe("xs");
		expect(root?.getAttribute("data-orientation")).toBe("vertical");
	});

	it("retombe sur l'état « done » quand aucun état n'est passé", () => {
		const { container } = render(<Attachment />);

		expect(container.querySelector('[data-slot="attachment"]')?.getAttribute("data-state")).toBe(
			"done",
		);
	});

	// Le balayage du titre est piloté par l'état du PARENT (`group-data-[state=…]`)
	// et non par une classe conditionnelle sur le titre : c'est ce qui permet à un
	// call site de ne rien savoir de l'animation.
	it("le titre porte le balayage gaté sur l'état du parent, jamais en dur", () => {
		const { container } = render(
			<Attachment state="processing">
				<AttachmentContent>
					<AttachmentTitle>rapport.pdf</AttachmentTitle>
				</AttachmentContent>
			</Attachment>,
		);

		const title = container.querySelector('[data-slot="attachment-title"]');
		const classes = title?.className.split(/\s+/) ?? [];

		// `motion-safe:` fait partie du contrat, pas de la décoration : l'utility
		// peint le texte avec un dégradé et met `color: transparent`. La neutraliser
		// depuis un bloc `prefers-reduced-motion` laisserait un titre INVISIBLE —
		// le seul repli correct est de ne pas l'appliquer du tout.
		expect(classes).toContain("group-data-[state=processing]/attachment:motion-safe:shimmer-text");
		expect(classes).toContain("group-data-[state=uploading]/attachment:motion-safe:shimmer-text");
		// Nue, elle rendrait le titre transparent dans TOUS les états.
		expect(classes).not.toContain("shimmer-text");
	});

	// `focus-within` n'a pas de pendant `:focus-visible` en CSS : il matche aussi
	// au clic, donc la carte se halait à la souris et empilait un second anneau
	// autour de celui du bouton au clavier.
	it("ne haale la carte qu'au focus CLAVIER, jamais via focus-within", () => {
		const { container } = render(<Attachment />);
		const className = container.querySelector('[data-slot="attachment"]')?.className ?? "";

		expect(className).toContain("has-[:focus-visible]:ring-1");
		expect(className).not.toMatch(/\bfocus-within:/);
	});
});

describe("AttachmentAction", () => {
	it("déclenche son handler au clic", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();

		render(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Retirer rapport.pdf" onClick={onClick} />
				</AttachmentActions>
			</Attachment>,
		);

		await user.click(screen.getByRole("button", { name: "Retirer rapport.pdf" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	// La cible visuelle fait 28px : sans l'extenseur, on est sous le plancher
	// tactile de 44px appliqué partout ailleurs dans le repo (WCAG 2.5.8).
	it("étend sa zone tactile à 44px par pseudo-élément", () => {
		render(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Retirer rapport.pdf" />
				</AttachmentActions>
			</Attachment>,
		);

		const className = screen.getByRole("button", { name: "Retirer rapport.pdf" }).className;
		expect(className).toContain("size-7");
		expect(className).toContain("after:-inset-2");
		// `after:absolute` sans `relative` sur le bouton ancrerait l'extenseur sur
		// un ancêtre — la zone atterrirait à côté de sa cible.
		expect(className.split(/\s+/)).toContain("relative");
	});

	// Une pièce jointe vit souvent dans un formulaire (téléversement de médias
	// produit) : sans `type`, retirer un fichier soumettrait le formulaire.
	it("est de type button par défaut, et se laisse surcharger", () => {
		const { rerender } = render(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Retirer rapport.pdf" />
				</AttachmentActions>
			</Attachment>,
		);

		expect(screen.getByRole("button", { name: "Retirer rapport.pdf" }).getAttribute("type")).toBe(
			"button",
		);

		rerender(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Retirer rapport.pdf" type="submit" />
				</AttachmentActions>
			</Attachment>,
		);

		expect(screen.getByRole("button", { name: "Retirer rapport.pdf" }).getAttribute("type")).toBe(
			"submit",
		);
	});

	// `size-7` vit dans le `className`, que cva concatène APRÈS les classes du
	// variant : posé inconditionnellement, il gagnait contre `h-9` (twMerge,
	// dernier gagnant) et `size="sm"` rendait un bouton de 28px avec le padding
	// d'un `sm`. La cible compacte doit donc s'effacer dès qu'une taille est
	// demandée — l'extenseur tactile avec elle, il ne sert que sous les 44px.
	it("laisse surcharger variant et taille — la cible compacte s'efface alors", () => {
		render(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Réessayer" variant="outline" size="sm" />
				</AttachmentActions>
			</Attachment>,
		);

		const className = screen.getByRole("button", { name: "Réessayer" }).className;
		expect(className).toContain("border");
		expect(className).not.toContain("size-7");
		expect(className).not.toContain("after:-inset-2");
	});

	// Deux extenseurs de 8px qui se font face réclament 16px de gouttière : sans
	// elle, celui de la seconde action recouvre 8px du CORPS de la première
	// (même z-index auto, l'ordre de peinture suit le DOM). L'assertion porte sur
	// la RELATION entre les deux valeurs, pas sur leur présence : changer
	// l'extenseur sans élargir la gouttière doit rougir.
	it("réserve une gouttière au moins égale aux deux extenseurs tactiles", () => {
		const { container } = render(
			<Attachment>
				<AttachmentActions>
					<AttachmentAction aria-label="Réessayer" />
					<AttachmentAction aria-label="Retirer" />
				</AttachmentActions>
			</Attachment>,
		);

		const actions = container.querySelector('[data-slot="attachment-actions"]')?.className ?? "";
		const button = screen.getByRole("button", { name: "Retirer" }).className;

		const inset = Number(button.match(/after:-inset-(\d+)/)?.[1]);
		const gutter = Number(actions.match(/has-\[>\*:nth-child\(2\)\]:gap-(\d+)/)?.[1]);

		expect(inset).toBeGreaterThan(0);
		expect(gutter).toBeGreaterThanOrEqual(inset * 2);
	});
});

describe("AttachmentTrigger", () => {
	it("reste sous les actions dans l'ordre d'empilement — les deux sont cliquables", async () => {
		const user = userEvent.setup();
		const onTrigger = vi.fn();
		const onAction = vi.fn();

		const { container } = render(
			<Attachment>
				<AttachmentContent>
					<AttachmentTitle>rapport.pdf</AttachmentTitle>
				</AttachmentContent>
				<AttachmentActions>
					<AttachmentAction aria-label="Retirer rapport.pdf" onClick={onAction} />
				</AttachmentActions>
				<AttachmentTrigger aria-label="Ouvrir rapport.pdf" onClick={onTrigger} />
			</Attachment>,
		);

		const trigger = screen.getByRole("button", { name: "Ouvrir rapport.pdf" });
		const actions = container.querySelector('[data-slot="attachment-actions"]');
		expect(trigger.className).toContain("z-10");
		expect(actions?.className).toContain("z-20");

		await user.click(trigger);
		await user.click(screen.getByRole("button", { name: "Retirer rapport.pdf" }));

		expect(onTrigger).toHaveBeenCalledTimes(1);
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	// La racine descend à `rounded-lg` en `size="xs"`, et le halo de `focus-ring`
	// (3px) suit le `border-radius` : un radius figé sur le trigger débordait les
	// coins de la carte. `rounded-[inherit]` est la seule forme correcte.
	it("hérite du radius de la carte au lieu de le figer", () => {
		const { container } = render(
			<Attachment size="xs">
				<AttachmentTrigger aria-label="Ouvrir rapport.pdf" />
			</Attachment>,
		);

		const className = container.querySelector('[data-slot="attachment-trigger"]')?.className ?? "";

		expect(className).toContain("rounded-[inherit]");
		expect(className).not.toMatch(/\brounded-(?!\[inherit\])/);
	});

	it("rend l'élément fourni via render sans lui injecter type=button", () => {
		render(
			<Attachment>
				<AttachmentTrigger render={<a href="/fichier.pdf" aria-label="Ouvrir rapport.pdf" />} />
			</Attachment>,
		);

		const link = screen.getByRole("link", { name: "Ouvrir rapport.pdf" });
		// Sur un `<a>`, `type` désigne le type MIME de la cible — pas un rôle.
		expect(link.getAttribute("type")).toBeNull();
		expect(link.getAttribute("data-slot")).toBe("attachment-trigger");
	});
});

describe("AttachmentMedia", () => {
	it("distingue icône et image par data-variant", () => {
		const { container } = render(
			<>
				<AttachmentMedia />
				<AttachmentMedia variant="image" />
			</>,
		);

		const media = container.querySelectorAll('[data-slot="attachment-media"]');
		expect(media[0]?.getAttribute("data-variant")).toBe("icon");
		expect(media[1]?.getAttribute("data-variant")).toBe("image");
	});
});

describe("AttachmentDescription", () => {
	it("bascule en teinte destructive via l'état du parent", () => {
		const { container } = render(
			<Attachment state="error">
				<AttachmentContent>
					<AttachmentDescription>Fichier trop volumineux</AttachmentDescription>
				</AttachmentContent>
			</Attachment>,
		);

		expect(container.querySelector('[data-slot="attachment-description"]')?.className).toContain(
			"group-data-[state=error]/attachment:text-destructive/80",
		);
	});
});
