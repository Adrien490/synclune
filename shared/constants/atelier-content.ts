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
 * `description` du HowTo : la copie historique (`docs/atelier-story.md`)
 * vouvoyait, elle a été réécrite ici, pas recopiée.
 */

/**
 * Photo de la section ET `image` du nœud HowTo — le POINT DE SWAP unique.
 *
 * TODO(photos-atelier) : c'est le portrait FOUNDER en placeholder (le même
 * asset que le schéma Founder) en attendant les vraies photos d'atelier. Le
 * jour où elles arrivent : remplacer cette URL et `ATELIER_IMAGE_ALT`, rien
 * d'autre — la section et le JSON-LD suivent. Le plan complet (galerie 4
 * scènes, alts prêts) est conservé dans `docs/atelier-story.md`.
 */
export const ATELIER_IMAGE = IMAGES.FOUNDER;

export const ATELIER_IMAGE_ALT = "Léane, créatrice des bijoux Synclune, dans son atelier à Nantes";

export interface AtelierStep {
	/** Fragment d'ancre : chaque `<li>` de la section porte `id="atelier-step-<id>"`. */
	id: string;
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
 * Champs du nœud `HowTo` qui n'apparaissent pas à l'écran (matériel, outils,
 * durée) — repris de la spec historique de `docs/atelier-story.md`. `name`
 * est AUSSI le `h3` rendu par la section : même chaîne, même source.
 */
export const ATELIER_HOWTO = {
	name: "Comment je crée tes bijoux",
	description:
		"De l'inspiration à la finition, les quatre étapes de création d'un bijou artisanal en plastique fou peint à la main, dans mon atelier à Nantes.",
	totalTime: "PT3H",
	supplies: [
		"Plastique fou",
		"Peinture acrylique",
		"Vernis de protection",
		"Supports de bijoux (crochets, chaînes, fermoirs)",
		"Perles décoratives",
	],
	tools: ["Pinceaux fins", "Four ménager", "Outils d'assemblage (pinces, anneaux)"],
} as const;
