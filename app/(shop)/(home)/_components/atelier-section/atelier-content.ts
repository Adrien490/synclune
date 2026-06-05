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
			"Lorsque j'ai commencé à créer des bijoux, c'était juste pour moi. Une véritable passion est née de ce passe-temps, grandissant au fil des ans.",
			"J'ai créé des bijoux pour ma famille, puis pour des amies, des amies d'amies… Et c'est ainsi que l'atelier Synclune est né ! Rien de tout cela n'était prévu, pourtant cela sonne aujourd'hui comme une évidence.",
			"Chaque bijou que vous retrouverez ici est une extension de la passion que j'éprouve lorsque je travaille sur mes créations. Chaque couleur, forme, ligne est pensée et choisie avec soin, pour donner vie à une pièce unique.",
		],
	},
} as const;
