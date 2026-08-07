import { IMAGES } from "@/shared/constants/images";

/**
 * SSOT du contenu de la section « Viens voir l'atelier » de la landing
 * (`app/(shop)/(home)/_components/atelier/atelier-section.tsx`) ET de son nœud
 * JSON-LD `HowTo` (`shared/components/structured-data.tsx`).
 *
 * Le fichier vit dans `shared/constants/` pour la même raison que
 * `faq-items.tsx` : `structured-data.tsx` ne peut pas importer depuis `app/`,
 * et Google compare le balisage au contenu visible — les deux consommateurs
 * DOIVENT lire la même source, sinon le schéma dérive de la page en silence.
 *
 * ⚠️ **Copie au TUTOIEMENT** (CLAUDE.md, § Voix) — y compris `name` et
 * `description` du HowTo : la copie historique vouvoyait, elle a été réécrite
 * ici, pas recopiée.
 */

/**
 * Photo de la section ET `image` du nœud HowTo — le POINT DE SWAP unique.
 *
 * TODO(photos-atelier) : c'est le portrait FOUNDER en placeholder (le même
 * asset que le schéma Founder) en attendant les vraies photos d'atelier. Le
 * jour où elles arrivent : remplacer cette URL et `ATELIER_IMAGE_ALT`, rien
 * d'autre — la section et le JSON-LD suivent.
 *
 * ⚠️ `null` tant que l'asset FOUNDER est mort (404 — cf. `IMAGES.FOUNDER`) :
 * la section rend alors la plaque dessinée et le nœud HowTo omet son `image`.
 */
export const ATELIER_IMAGE: string | null = IMAGES.FOUNDER;

export const ATELIER_IMAGE_ALT = "Léane, créatrice des bijoux Synclune, dans son atelier à Nantes";

/**
 * Union LITTÉRALE des ids d'étapes — pas un `string` : c'est elle qui permet à
 * la section de keyer ses vignettes de geste en `Record<AtelierStepId, …>`,
 * donc d'échouer au typecheck si une étape arrive sans vignette.
 */
export type AtelierStepId = "idea" | "materials" | "assembly" | "finishing";

export interface AtelierStep {
	/** Fragment d'ancre : chaque `<li>` de la section porte `id="atelier-step-<id>"`. */
	id: AtelierStepId;
	title: string;
	description: string;
}

/**
 * Les quatre étapes de création — rendues par la section (`<ol>`) et émises
 * comme `HowToStep` (les `url` du schéma pointent les ancres réelles
 * `#atelier-step-<id>`, contrat verrouillé par le test de la section).
 */
export const ATELIER_STEPS: ReadonlyArray<AtelierStep> = [
	{
		id: "idea",
		title: "D'abord, une idée",
		description:
			"Une couleur croisée dans la rue, un motif sur un tissu, un rêve… Je laisse l'inspiration venir, sans forcer.",
	},
	{
		id: "materials",
		title: "Le bon matériel",
		description:
			"Plastique fou, peinture, perles : je choisis chaque élément un par un, avec soin.",
	},
	{
		id: "assembly",
		title: "La cuisson et l'assemblage",
		description:
			"Chaque bijou a sa propre recette de fabrication — c'est ce qui rend chaque pièce unique.",
	},
	{
		id: "finishing",
		title: "La touche finale",
		description:
			"Je polis, je vérifie chaque détail, puis je glisse ton bijou dans sa pochette, avec amour.",
	},
] as const;

/**
 * Le nœud `HowTo` du `@graph` — et, depuis l'audit du 2026-08-06, **tout y est
 * visible à l'écran**.
 *
 * ⚠️ Matériel, outils et durée étaient balisés sans exister nulle part sur la
 * page : le principe qui gouverne `#atelier` et `#faq` (« le balisage doit
 * pointer du contenu réellement visible ») était donc tenu pour les étapes et
 * violé pour le reste du nœud. Ils sont désormais rendus par
 * `atelier-worktable.tsx` (« Sur la table »), qui remplissait au passage les
 * deux vides mesurés de la section — 362×476 px de plaque creuse à `lg`, et
 * ~420×370 px de blanc à 768.
 *
 * `name` est AUSSI le `h3` rendu par la section : même chaîne, même source.
 */
export const ATELIER_HOWTO = {
	name: "Comment je crée tes bijoux",
	description:
		"De l'inspiration à la finition, les quatre étapes de création d'un bijou artisanal en plastique fou peint à la main, dans mon atelier à Nantes.",
	totalTime: "PT3H",
	/**
	 * La même durée, en français et au tutoiement — le pendant LISIBLE de
	 * `totalTime`. Les deux vivent côte à côte pour ne pas dériver : une durée
	 * affichée qui contredirait la durée balisée est exactement le genre
	 * d'incohérence que Google relève. Parité verrouillée par le test de la
	 * section.
	 */
	totalTimeLabel: "environ 3 h par bijou",
	supplies: [
		"Plastique fou",
		"Peinture acrylique",
		"Vernis de protection",
		"Supports de bijoux (crochets, chaînes, fermoirs)",
		"Perles décoratives",
	],
	tools: ["Pinceaux fins", "Four ménager", "Outils d'assemblage (pinces, anneaux)"],
} as const;
