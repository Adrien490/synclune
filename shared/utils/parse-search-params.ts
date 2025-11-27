import { z } from "zod";

/**
 * Safely parse a search parameter with a Zod schema
 * Returns the parsed value or the default value if validation fails
 */
export function parseSearchParam<T>(
	value: string | string[] | undefined,
	schema: z.ZodType<T>,
	defaultValue: T
): T {
	// Get first value if array
	const firstValue = Array.isArray(value) ? value[0] : value;

	if (!firstValue) {
		return defaultValue;
	}

	const result = schema.safeParse(firstValue);
	return result.success ? result.data : defaultValue;
}

/**
 * Common search parameter parsers
 */
export const searchParamParsers = {
	/**
	 * Parse cursor parameter (25 character CUID)
	 */
	cursor: (value: string | string[] | undefined): string | undefined => {
		return parseSearchParam(value, z.string().length(25), undefined);
	},

	/**
	 * Parse direction parameter
	 */
	direction: (
		value: string | string[] | undefined
	): "forward" | "backward" => {
		return parseSearchParam(
			value,
			z.enum(["forward", "backward"]),
			"forward"
		);
	},

	/**
	 * Parse perPage parameter with min/max constraints
	 */
	perPage: (
		value: string | string[] | undefined,
		defaultValue = 10,
		maxValue = 100
	): number => {
		return parseSearchParam(
			value,
			z.coerce.number().int().min(1).max(maxValue),
			defaultValue
		);
	},

	/**
	 * Parse search query with max length
	 */
	search: (
		value: string | string[] | undefined,
		maxLength = 200
	): string | undefined => {
		return parseSearchParam(
			value,
			z.string().max(maxLength),
			undefined
		);
	},

	/**
	 * Parse enum parameter with validation - preserves literal types
	 */
	enum: <const T extends readonly string[]>(
		value: string | string[] | undefined,
		validValues: T,
		defaultValue: T[number]
	): T[number] => {
		const firstValue = Array.isArray(value) ? value[0] : value;

		if (!firstValue) {
			return defaultValue;
		}

		return validValues.includes(firstValue)
			? (firstValue as T[number])
			: defaultValue;
	},

	/**
	 * Parse sortBy parameter with validation against allowed fields
	 */
	sortBy: <const T extends readonly string[]>(
		value: string | string[] | undefined,
		validFields: T,
		defaultValue: T[number]
	): T[number] => {
		return searchParamParsers.enum(value, validFields, defaultValue);
	},

	/**
	 * Parse boolean parameter
	 */
	boolean: (
		value: string | string[] | undefined,
		defaultValue = false
	): boolean => {
		const firstValue = Array.isArray(value) ? value[0] : value;

		if (!firstValue) {
			return defaultValue;
		}

		return firstValue === "true" || firstValue === "1";
	},

	/**
	 * Parse array of strings with validation
	 */
	stringArray: (
		value: string | string[] | undefined,
		schema?: z.ZodString
	): string[] => {
		const values = Array.isArray(value) ? value : value ? [value] : [];

		if (!schema) {
			return values;
		}

		return values.filter((v) => schema.safeParse(v).success);
	},

	/**
	 * Parse date parameter
	 */
	date: (
		value: string | string[] | undefined,
		defaultValue?: Date
	): Date | undefined => {
		return parseSearchParam(
			value,
			z.string().datetime().transform((s) => new Date(s)),
			defaultValue
		);
	},
};

/**
 * Type helper to extract first param from Next.js searchParams
 */
export function getFirstParam(
	param: string | string[] | undefined
): string | undefined {
	return Array.isArray(param) ? param[0] : param;
}
