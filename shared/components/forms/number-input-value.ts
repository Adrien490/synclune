/**
 * SSOT du contrat `type="number"` des champs TanStack (`InputField`,
 * `InputGroupField`) :
 *
 * - champ vide (`valueAsNumber` = NaN) → `null`, pour distinguer « pas de
 *   valeur » de zéro sur les champs optionnels ;
 * - `0` est une vraie valeur : affichée et préservée ;
 * - `null` / `undefined` / `""` / NaN → chaîne vide à l'affichage.
 *
 * Les deux composants dupliquaient cette logique avec un traitement de `""`
 * divergent (audit InputField 2026-08-03, P2-1).
 */

export function parseNumberInputValue(input: HTMLInputElement): number | null {
	const numValue = input.valueAsNumber;
	return Number.isNaN(numValue) ? null : numValue;
}

export function displayNumberValue(value: string | number | null | undefined): string | number {
	if (value === null || value === undefined || value === "") return "";
	if (typeof value === "number" && Number.isNaN(value)) return "";
	return value;
}
