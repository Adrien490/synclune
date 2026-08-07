import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock — seule la primitive Next l'est : c'est le rendu RÉEL de la section
// (shell, papier lavé, notes d'étapes, polaroid) qu'on teste, comme les
// voisines `collections-section.test.tsx` / `faq-section.test.tsx`.
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

import { CREATION_PATHS } from "@/shared/components/hand-drawn/paths";
import {
	ATELIER_HOWTO,
	ATELIER_IMAGE,
	ATELIER_IMAGE_ALT,
	ATELIER_STEPS,
} from "@/shared/constants/atelier-content";

import { AtelierSection } from "../atelier-section";

afterEach(cleanup);

/** L'encre du fil — le rose LISIBLE, pas le pastel de surface (audit 2026-08-06). */
const THREAD_INK = "var(--color-brand-rose-strong)";

/** Les quatre accents de marque dans l'ordre du rail. */
const GAMME = ["rose", "lavender", "mint", "sun"];

describe("AtelierSection — hiérarchie et contrat HowTo", () => {
	it("rend un h2, un seul h3 (= le name du HowTo) et aucun h4", () => {
		render(<AtelierSection />);

		expect(screen.getByRole("heading", { level: 2, name: "Viens voir l'atelier" })).toBeDefined();

		// Le h3 est MOT POUR MOT le `name` du nœud HowTo du @graph : la SSOT
		// `ATELIER_HOWTO` est bi-consommée pour que balisage et visible ne
		// puissent pas diverger.
		const h3s = screen.getAllByRole("heading", { level: 3 });
		expect(h3s).toHaveLength(1);
		expect(h3s[0]!.textContent).toBe(ATELIER_HOWTO.name);

		// Pas de h4 : les titres d'étapes sont des <p> (quatre items d'une ligne
		// dans un <ol> — la FAQ met des h4 sur des items INTERACTIFS repliés,
		// pas le cas ici), donc aucun saut de niveau possible. Le bloc « Sur la
		// table » n'en introduit pas non plus : ses intitulés sont des <p>.
		expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
	});

	it("rend une étape par entrée de la SSOT, dans l'ordre, chacune avec son ancre", () => {
		const { container } = render(<AtelierSection />);

		const items = container.querySelectorAll("ol > li");
		expect(items).toHaveLength(ATELIER_STEPS.length);

		ATELIER_STEPS.forEach((step, index) => {
			const item = items[index]!;
			// L'`url` du HowToStep correspondant pointe `#atelier-step-<id>` :
			// sans cette ancre, le schéma référencerait un fragment mort.
			expect(item.id).toBe(`atelier-step-${step.id}`);
			expect(item.textContent).toContain(step.title);
			expect(item.textContent).toContain(step.description);
		});
	});

	it("les numéros d'étapes sont décoratifs (l'<ol> porte déjà l'ordre)", () => {
		const { container } = render(<AtelierSection />);

		const firstItem = container.querySelector("ol > li")!;
		const ornament = firstItem.querySelector('[aria-hidden="true"] svg');
		// Le chiffre ET sa pastille vivent sous un même conteneur aria-hidden —
		// sinon VoiceOver annoncerait « 1, 1 sur 4, D'abord une idée ».
		expect(ornament).not.toBeNull();
	});

	// ⚠️ Le nœud HowTo émet `supply`, `tool` et `totalTime`. Ils étaient balisés
	// sans exister nulle part à l'écran — le principe qui gouverne `#atelier` et
	// `#faq` (« le balisage doit pointer du contenu réellement visible ») était
	// tenu pour les étapes et violé pour le reste du nœud. Ce test est ce qui
	// empêche de re-supprimer le bloc « Sur la table » sans toucher au schéma.
	it("rend VISIBLEMENT tout ce que le nœud HowTo déclare (matières, outils, durée)", () => {
		const { container } = render(<AtelierSection />);

		const text = container.textContent;
		for (const supply of ATELIER_HOWTO.supplies) expect(text).toContain(supply);
		for (const tool of ATELIER_HOWTO.tools) expect(text).toContain(tool);
		expect(text).toContain(ATELIER_HOWTO.totalTimeLabel);
	});

	it("la durée affichée et la durée balisée disent la même chose", () => {
		// `PT3H` ↔ « environ 3 h par bijou » : les deux vivent côte à côte dans la
		// SSOT pour ne pas dériver, encore faut-il que le chiffre suive.
		const hours = /^PT(\d+)H$/u.exec(ATELIER_HOWTO.totalTime)?.[1];
		expect(hours).toBeDefined();
		expect(ATELIER_HOWTO.totalTimeLabel).toContain(`${hours} h`);
	});
});

describe("AtelierSection — accent rose", () => {
	it("porte data-accent='rose' ET un consommateur du lavis", () => {
		const { container } = render(<AtelierSection />);

		// Un `data-accent` sans consommateur ment sur l'existence d'une cascade
		// (cf. JSDoc d'HeroSection) : ici le papier de la confidence consomme
		// `--section-wash`, c'est lui qui justifie l'attribut.
		const section = container.querySelector("section");
		expect(section?.getAttribute("data-accent")).toBe("rose");
		expect(container.querySelector(".bg-\\(--section-wash\\)")).not.toBeNull();
	});

	// La FAQ, section IMMÉDIATEMENT suivante, porte `data-accent="sun"` : c'est
	// la raison pour laquelle le doré a été écarté quand la salle a quitté la
	// lavande (2026-08-06). Repasser l'atelier en `sun` fondrait les deux salles.
	it("n'emprunte pas l'accent de la section voisine (FAQ = sun)", () => {
		const { container } = render(<AtelierSection />);

		expect(container.querySelector("section")?.getAttribute("data-accent")).not.toBe("sun");
	});

	// ⚠️ La polychromie se joue par ROTATION D'ACCENTS, pas par un tableau de
	// tokens littéraux : la version d'avant recopiait `var(--primary)` &co dans
	// le composant, sans être keyée sur `AtelierStepId` — une cinquième étape
	// recevait `undefined` en silence.
	it("chaque note porte son accent en data-accent, dans l'ordre du rail", () => {
		const { container } = render(<AtelierSection />);

		const accents = [...container.querySelectorAll("ol > li")].map((li) =>
			li.getAttribute("data-accent"),
		);
		expect(accents).toEqual(GAMME.slice(0, ATELIER_STEPS.length));
	});
});

describe("AtelierSection — portrait", () => {
	// Deux états, branchés sur la SSOT : tant que `ATELIER_IMAGE` est null
	// (asset FOUNDER en 404), le cadre rend la plaque dessinée — jamais un trou
	// blanc publié avec son alt ; le jour du ré-upload, la branche photo reprend
	// seule. Les DEUX branches restent écrites pour que le contrat survive au swap.
	if (ATELIER_IMAGE) {
		it("rend le portrait SSOT avec son alt, et une légende cursive", () => {
			const { container } = render(<AtelierSection />);

			const img = screen.getByRole("img", { name: ATELIER_IMAGE_ALT });
			expect(img.getAttribute("src")).toBe(ATELIER_IMAGE);

			// Une légende de photo, pas une signature (cf. le test de voix).
			const caption = container.querySelector("figcaption");
			expect(caption?.textContent).toContain("C'est moi, Léane");
		});
	} else {
		it("rend la plaque dessinée — aucun <img>, et la légende assume l'attente", () => {
			const { container } = render(<AtelierSection />);

			// Aucune image publiée : ni l'URL morte, ni son alt.
			expect(screen.queryByRole("img")).toBeNull();

			// La plaque est le 2ᵉ consommateur du lavis, APRÈS la confidence —
			// « au moins un » laisserait la confidence perdre le sien en silence.
			expect(container.querySelectorAll(".bg-\\(--section-wash\\)")).toHaveLength(2);

			const caption = container.querySelector("figcaption");
			expect(caption?.textContent).toContain("Le portrait arrive");
		});

		// ⚠️ Le cœur était peint en `--section-accent` — donc `--primary` depuis
		// que la salle est rose, soit exactement la teinte dont `--section-wash`
		// est fait : 1,53:1 mesuré, un cœur invisible sur une plaque de
		// 362×476 px. `--color-brand-rose-strong` est le rose qui porte (5,06:1).
		it("peint le cœur de la plaque en rose LISIBLE, jamais à l'accent de la salle", () => {
			const { container } = render(<AtelierSection />);

			const plaque = container.querySelectorAll(".bg-\\(--section-wash\\)")[0]!;
			const heart = plaque.querySelector("svg path");
			expect(heart?.getAttribute("stroke")).toBe("var(--color-brand-rose-strong)");
		});
	}
});

describe("AtelierSection — le fil (rail continu, 2026-08-06)", () => {
	// ⚠️ Le fil était CINQ `<svg>` logés dans les gaps de 52 px de l'<ol>, donc
	// absent le long de chaque note : 44 % d'encre sur son axe à 390 px, 55 % à
	// 1280, quatre trous de 63 à 130 px, et un ratio qui se DÉGRADAIT en
	// rétrécissant le viewport. La continuité est désormais STRUCTURELLE — c'est
	// ce que verrouille `atelier-thread-continuity.regression.test.tsx`.

	it("le fil est UN seul élément, et il enveloppe la colonne enfilée", () => {
		const { container } = render(<AtelierSection />);

		const rails = container.querySelectorAll(".atelier-thread-rail");
		expect(rails).toHaveLength(1);

		// Le rail et l'<ol> partagent le même conteneur positionné : c'est ce qui
		// fait courir le fil sur TOUTE la colonne, quelles que soient les hauteurs.
		const ol = container.querySelector("ol")!;
		expect(rails[0]!.parentElement?.contains(ol)).toBe(true);
	});

	it("le fil est mono, à l'encre LISIBLE — et il ne suit pas la rotation d'accents", () => {
		const { container } = render(<AtelierSection />);

		const rail = container.querySelector(".atelier-thread-rail") as HTMLElement;
		// L'encre passe par une variable, pas par `background-color` en dur : le
		// masque ne peut pas porter la couleur (une data-URI ne voit pas var()).
		expect(rail.style.getPropertyValue("--atelier-thread-ink")).toBe(THREAD_INK);
		// Le fil traverse quatre `<li>` accentués : il doit rester explicite.
		expect(rail.style.getPropertyValue("--atelier-thread-ink")).not.toContain("--section-accent");
	});

	it("termine le fil par le nœud-attache et la pampille — le bijou fabriqué, sans CTA derrière", () => {
		const { container } = render(<AtelierSection />);

		const knots = container.querySelectorAll('svg[viewBox="0 0 32 32"]');
		expect(knots).toHaveLength(1);
		expect(knots[0]!.querySelector("path")?.getAttribute("stroke")).toBe(THREAD_INK);

		// Les 4 attaches en UN tracé multi-sous-paths (un geste, comme
		// l'étincelle), à l'encre du fil.
		const strings = container.querySelectorAll('svg[viewBox="0 0 96 26"]');
		expect(strings).toHaveLength(1);
		expect(strings[0]!.querySelector("path")?.getAttribute("stroke")).toBe(THREAD_INK);
	});

	// ⚠️ Les gouttes étaient des CONTOURS à l'accent : 1,5 à 2,6:1, quatre
	// filets pâles au moment du payoff. L'accent PEINT, l'encre TRACE — un aplat
	// d'accent vaut 7,8 à 13,4:1 sous l'encre, un trait ne vaut rien.
	it("la pampille est REMPLIE, une goutte par étape, à l'accent de son étape", () => {
		const { container } = render(<AtelierSection />);

		// Scopé à la pampille : la goutte du présentoir sert AUSSI de puce aux
		// inventaires de « Sur la table », un `querySelectorAll` global en
		// ramènerait douze.
		const pampille = container.querySelector('svg[viewBox="0 0 96 26"]')!.parentElement!;
		const drops = pampille.querySelectorAll('svg[viewBox="0 0 40 48"]');
		expect(drops).toHaveLength(ATELIER_STEPS.length);

		drops.forEach((drop, index) => {
			const path = drop.querySelector("path")!;
			// Remplie de l'accent CASCADÉ — le wrapper porte le data-accent de
			// l'étape, exactement comme sa note.
			expect(path.getAttribute("fill")).toBe("var(--section-accent)");
			expect(drop.parentElement?.getAttribute("data-accent")).toBe(GAMME[index]);
			// Elle se dessine comme le reste : dash normalisé (sans pathLength,
			// `stroke-dasharray: 1` rendrait un pointillé).
			expect(path.classList.contains("hand-draw-inview")).toBe(true);
			expect(path.getAttribute("pathLength")).toBe("1");
		});
	});

	it("la perle est un APLAT, et la PIÈCE est dessinée en encre par-dessus", () => {
		const { container } = render(<AtelierSection />);

		const items = container.querySelectorAll("ol > li");
		items.forEach((item) => {
			const bead = item.querySelector('[aria-hidden="true"] svg[viewBox="0 0 100 95"]')!;
			expect(bead.querySelector("path")!.getAttribute("fill")).toBe("var(--section-accent)");

			// ⚠️ La pastille est rendue AVANT la pièce : remplie et posée après,
			// elle recouvrirait le dessin.
			const holder = bead.parentElement!;
			expect(holder.firstElementChild).toBe(bead);

			// L'aplat porte la couleur, l'ENCRE porte la forme : un tracé à
			// l'accent vaut 1,6:1 sur carte blanche, la même forme en encre sur
			// l'aplat vaut 7,8 à 12,7:1.
			const parts = [...holder.querySelectorAll("svg")].filter((svg) => svg !== bead);
			expect(parts.length).toBeGreaterThanOrEqual(2);
			for (const part of parts) {
				expect(part.querySelector("path")?.getAttribute("stroke")).toBe("var(--foreground)");
			}
		});
	});

	// ⚠️ Ce test remplace « chaque note porte SA vignette de geste ». Les quatre
	// timbres (étincelle / goutte / chaleur / nœud-ruban) étaient un pictogramme
	// par étape — le patron « comment ça marche » du web, tracé à la main : on
	// pouvait remplacer les libellés par un onboarding SaaS sans rien changer à
	// la composition. Aucun des huit disques de la section ne représentait ce que
	// Léane fabrique. C'est ce que cette assertion empêche de rouvrir.
	it("chaque perle montre la PIÈCE à son étape, prise dans CREATION_PATHS", () => {
		const { container } = render(<AtelierSection />);

		const items = container.querySelectorAll("ol > li");
		expect(items).toHaveLength(4);

		// Les viewBox attendus, dans l'ordre du rail : les couleurs repérées
		// (3 touches) → les matières (2 grains + 1 goutte) → le cabochon sorti du
		// four (+ son reflet) → le MÊME cabochon monté sur sa créole.
		const expected = [
			[CREATION_PATHS.dab, CREATION_PATHS.dab, CREATION_PATHS.dab],
			[CREATION_PATHS.berry, CREATION_PATHS.berry, CREATION_PATHS.drop],
			[CREATION_PATHS.cabochon, CREATION_PATHS.glint],
			[CREATION_PATHS.hoop, CREATION_PATHS.cabochon],
		];

		items.forEach((item, index) => {
			const bead = item.querySelector('[aria-hidden="true"] svg[viewBox="0 0 100 95"]')!;
			const parts = [...bead.parentElement!.querySelectorAll("svg")].filter((svg) => svg !== bead);
			expect(parts.map((svg) => svg.getAttribute("viewBox"))).toEqual(
				expected[index]!.map((p) => p.viewBox),
			);
		});

		// Plus aucun timbre de geste : les vignettes 48×48 ont disparu de l'<ol>.
		expect(container.querySelectorAll('ol svg[viewBox="0 0 48 48"]')).toHaveLength(0);
	});

	it("le rang a quitté la perle et se lit en coin de note, hors de l'arbre a11y", () => {
		const { container } = render(<AtelierSection />);

		container.querySelectorAll("ol > li").forEach((item, index) => {
			const rank = item.querySelector('p[aria-hidden="true"]')!;
			expect(rank.textContent).toBe(String(index + 1).padStart(2, "0"));
			// L'<ol> annonce déjà « n sur 4 » : l'entendre deux fois n'aide personne.
			expect(rank.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("le processus est une COLONNE unique — la grille 2×2 est morte", () => {
		const { container } = render(<AtelierSection />);

		const list = container.querySelector("ol")!;
		expect(list.className).toContain("flex-col");
		expect(list.className).not.toContain("grid-cols-2");
	});
});

describe("AtelierSection — voix et périmètre", () => {
	it("tutoie — aucun lexique vouvoyant dans le rendu", () => {
		// La copie historique de l'atelier VOUVOYAIT : ce test est
		// ce qui empêche de la recopier telle quelle (même défaut co-visible que
		// celui corrigé sur /paiement, `checkout-voice-tutoiement`).
		const { container } = render(<AtelierSection />);

		expect(container.textContent).not.toMatch(/\b(vous|votre|vos|veuillez)\b/iu);
	});

	it("ne signe pas « — Léane » (le storefront ne signe plus nulle part, footer inclus depuis le 2026-08-06)", () => {
		const { container } = render(<AtelierSection />);

		expect(container.textContent).not.toContain("— Léane");
	});

	it("n'émet aucun JSON-LD local (le HowTo est un nœud du @graph de la page)", () => {
		const { container } = render(<AtelierSection />);

		expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
	});

	it("ne rend aucun lien (rien à lier — la sortie de bas de page appartient à la FAQ)", () => {
		render(<AtelierSection />);

		expect(screen.queryAllByRole("link")).toHaveLength(0);
	});
});
