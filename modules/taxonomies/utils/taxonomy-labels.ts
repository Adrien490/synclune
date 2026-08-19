import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Accorde un adjectif ou un participe passé au genre de la taxonomie.
 *
 * `agree(config, "supprimé")` → « supprimée » pour une couleur.
 * `agree(config, "Actif")`    → « Active »   pour une couleur.
 *
 * Couvre le cas régulier (ajout d'un « e ») et la terminaison en « -if », la
 * seule irrégularité rencontrée dans ces libellés. Toute autre irrégularité
 * (« -eux » → « -euse », « -er » → « -ère »…) doit être écrite en toutes
 * lettres dans le registre plutôt qu'ajoutée ici : mieux vaut une donnée
 * explicite qu'un moteur de morphologie approximatif.
 */
export function agree(config: TaxonomyConfig, masculine: string): string {
	if (!config.labels.feminine) return masculine;
	if (masculine.endsWith("if")) return `${masculine.slice(0, -2)}ive`;
	return `${masculine}e`;
}

/**
 * Compose « 3 variantes » / « 1 produit » en accordant le pluriel.
 *
 * Pluriel à partir de 2 : le français garde le singulier à zéro comme à un
 * (« 0 variante », « 1 variante »).
 */
export function formatUsage(config: TaxonomyConfig, count: number): string {
	const noun = count > 1 ? config.usage.plural : config.usage.singular;
	return `${count} ${noun}`;
}
