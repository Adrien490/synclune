/**
 * Contenu narratif de l'Atelier section.
 *
 * Centralise les copies (subtitle, alt photo hero, confession) au même titre
 * que polaroid-config.ts et process-steps.ts. Prépare l'i18n futur (extract
 * vers i18n/fr/atelier.json le moment venu).
 */
export const ATELIER_CONTENT = {
	subtitle: "Là où chaque bijou prend vie, un geste à la fois.",
	heroImageAlt: "L'atelier de création Synclune, où chaque bijou prend vie",
	confession: {
		intro: "Je vais vous faire une confidence.",
		paragraphs: [
			"Quand j'ai commencé à créer des bijoux, c'était juste pour moi.",
			"Et puis, des amies ont voulu les mêmes. Puis des amies d'amies. Et me voilà, dans mon petit atelier ! C'était pas prévu à la base.",
			"Chaque bijou que vous voyez ici, j'ai choisi ses couleurs, peint ses motifs, assemblé chaque perle. Il n'existe qu'en quelques exemplaires (parfois moins de dix).",
		],
	},
} as const;
