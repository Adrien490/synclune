/**
 * Extracts the first value from a URL parameter.
 * Useful when dealing with Next.js searchParams that can be string | string[] | undefined.
 *
 * @param param - The URL parameter value
 * @returns The first string value, or undefined if param is undefined
 *
 * @example
 * ```ts
 * const id = getFirstParam(searchParams.id); // string | undefined
 * ```
 */
export const getFirstParam = (param: string | string[] | undefined): string | undefined => {
	if (Array.isArray(param)) return param[0];
	return param;
};

/**
 * Extrait TOUTES les valeurs d'un paramètre d'URL répétable.
 *
 * À utiliser pour les filtres multi-sélection : les feuilles de filtres écrivent
 * `params.append("filter_paymentStatus", …)` plusieurs fois, et `getFirstParam()`
 * ne retenait alors que la première valeur — les cases suivantes étaient
 * silencieusement ignorées.
 *
 * @returns Tableau des valeurs non vides, ou `undefined` si le paramètre est absent.
 */
export const getAllParams = (param: string | string[] | undefined): string[] | undefined => {
	if (param === undefined) return undefined;
	const values = (Array.isArray(param) ? param : [param]).filter((v) => v !== "");
	return values.length > 0 ? values : undefined;
};
