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
const getAllParams = (param: string | string[] | undefined): string[] | undefined => {
	if (param === undefined) return undefined;
	const values = (Array.isArray(param) ? param : [param]).filter((v) => v !== "");
	return values.length > 0 ? values : undefined;
};

/**
 * Variante de `getAllParams` restreinte à un ensemble de valeurs autorisées
 * (typiquement un enum Prisma), à utiliser pour tout filtre d'URL branché sur une
 * couche `data/` dont le `safeParse` **throw**.
 *
 * ⚠️ Une valeur d'URL castée sans contrôle d'appartenance (`value as OrderStatus`)
 * traverse TypeScript sans bruit, puis fait échouer le schéma de la data fn — qui
 * lève « Invalid parameters » hors du `try/catch` du fetcher, donc une **error
 * boundary**. `?filter_status=BOGUS` renvoyait ainsi un 500 sur `/admin/ventes/
 * commandes`, alors que les bornes de montant et de date du même parseur étaient
 * déjà défensives. Une URL forgée ne doit jamais produire un 500.
 *
 * @returns Les valeurs retenues, ou `undefined` si aucune ne survit — soit « pas de
 * filtre », plutôt qu'un filtre qui ne matche rien.
 */
export const getAllParamsIn = <const T extends readonly string[]>(
	param: string | string[] | undefined,
	allowed: T,
): T[number][] | undefined => {
	const values = getAllParams(param);
	if (!values) return undefined;

	const allowedSet = new Set<string>(allowed);
	const kept = values.filter((value): value is T[number] => allowedSet.has(value));
	return kept.length > 0 ? kept : undefined;
};
