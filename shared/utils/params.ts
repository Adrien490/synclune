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
export const getFirstParam = (
	param: string | string[] | undefined
): string | undefined => {
	if (Array.isArray(param)) return param[0];
	return param;
};
