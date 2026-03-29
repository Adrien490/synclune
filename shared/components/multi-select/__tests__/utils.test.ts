import { describe, it, expect } from "vitest";

import {
	arraysEqual,
	isGroupedOptions,
	getBadgeAnimationClass,
	getPopoverAnimationClass,
	getResponsiveSettings,
	flattenOptions,
	filterOptions,
	getWidthConstraints,
} from "../utils";
import type { MultiSelectGroup, MultiSelectOption } from "../types";

// ============================================================================
// arraysEqual
// ============================================================================

describe("arraysEqual", () => {
	it("returns true for identical arrays", () => {
		expect(arraysEqual(["a", "b"], ["a", "b"])).toBe(true);
	});

	it("returns true for same elements in different order", () => {
		expect(arraysEqual(["b", "a"], ["a", "b"])).toBe(true);
	});

	it("returns false for different lengths", () => {
		expect(arraysEqual(["a"], ["a", "b"])).toBe(false);
	});

	it("returns false for different elements", () => {
		expect(arraysEqual(["a", "c"], ["a", "b"])).toBe(false);
	});

	it("returns true for empty arrays", () => {
		expect(arraysEqual([], [])).toBe(true);
	});
});

// ============================================================================
// isGroupedOptions
// ============================================================================

describe("isGroupedOptions", () => {
	it("returns true for grouped options", () => {
		const groups: MultiSelectGroup[] = [
			{ heading: "Group 1", options: [{ label: "A", value: "a" }] },
		];
		expect(isGroupedOptions(groups)).toBe(true);
	});

	it("returns false for flat options", () => {
		const options: MultiSelectOption[] = [{ label: "A", value: "a" }];
		expect(isGroupedOptions(options)).toBe(false);
	});

	it("returns false for empty array", () => {
		expect(isGroupedOptions([])).toBe(false);
	});
});

// ============================================================================
// getBadgeAnimationClass
// ============================================================================

describe("getBadgeAnimationClass", () => {
	it("returns empty string when config is undefined", () => {
		expect(getBadgeAnimationClass()).toBe("");
	});

	it("returns empty string when badgeAnimation is undefined", () => {
		expect(getBadgeAnimationClass({})).toBe("");
	});

	it("returns animation class for valid animation type", () => {
		const result = getBadgeAnimationClass({ badgeAnimation: "fade" });
		expect(typeof result).toBe("string");
	});
});

// ============================================================================
// getPopoverAnimationClass
// ============================================================================

describe("getPopoverAnimationClass", () => {
	it("returns empty string when config is undefined", () => {
		expect(getPopoverAnimationClass()).toBe("");
	});

	it("returns empty string when popoverAnimation is undefined", () => {
		expect(getPopoverAnimationClass({})).toBe("");
	});

	it("returns animation class for valid animation type", () => {
		const result = getPopoverAnimationClass({ popoverAnimation: "slide" });
		expect(typeof result).toBe("string");
	});
});

// ============================================================================
// getResponsiveSettings
// ============================================================================

describe("getResponsiveSettings", () => {
	it("returns non-responsive settings when responsive is false", () => {
		const result = getResponsiveSettings(false, "desktop", 5);
		expect(result.maxCount).toBe(5);
	});

	it("returns non-responsive settings when responsive is undefined", () => {
		const result = getResponsiveSettings(undefined, "desktop", 3);
		expect(result.maxCount).toBe(3);
	});

	it("returns default responsive config when responsive is true", () => {
		const result = getResponsiveSettings(true, "mobile", 10);
		expect(result).toHaveProperty("maxCount");
		expect(result).toHaveProperty("hideIcons");
		expect(result).toHaveProperty("compactMode");
	});

	it("returns custom responsive config for each screen size", () => {
		const config = {
			mobile: { maxCount: 2, hideIcons: true, compactMode: true },
			tablet: { maxCount: 4, hideIcons: false, compactMode: false },
			desktop: { maxCount: 8 },
		};
		const mobile = getResponsiveSettings(config, "mobile", 10);
		expect(mobile.maxCount).toBe(2);
		expect(mobile.hideIcons).toBe(true);
		expect(mobile.compactMode).toBe(true);

		const desktop = getResponsiveSettings(config, "desktop", 10);
		expect(desktop.maxCount).toBe(8);
		expect(desktop.hideIcons).toBe(false);
		expect(desktop.compactMode).toBe(false);
	});

	it("uses maxCount fallback when config field is missing", () => {
		const config = { mobile: {}, tablet: {}, desktop: {} };
		const result = getResponsiveSettings(config, "mobile", 7);
		expect(result.maxCount).toBe(7);
	});
});

// ============================================================================
// flattenOptions
// ============================================================================

describe("flattenOptions", () => {
	const options: MultiSelectOption[] = [
		{ label: "A", value: "a" },
		{ label: "B", value: "b" },
	];

	const groups: MultiSelectGroup[] = [
		{ heading: "G1", options: [{ label: "A", value: "a" }] },
		{ heading: "G2", options: [{ label: "B", value: "b" }] },
	];

	it("returns empty array for empty input", () => {
		expect(flattenOptions([], false)).toEqual([]);
	});

	it("returns flat options as-is", () => {
		expect(flattenOptions(options, false)).toEqual(options);
	});

	it("flattens grouped options", () => {
		const result = flattenOptions(groups, false);
		expect(result).toHaveLength(2);
		expect(result[0]?.value).toBe("a");
		expect(result[1]?.value).toBe("b");
	});

	it("deduplicates when enabled", () => {
		const dupes: MultiSelectOption[] = [
			{ label: "A", value: "a" },
			{ label: "A2", value: "a" },
			{ label: "B", value: "b" },
		];
		const result = flattenOptions(dupes, true);
		expect(result).toHaveLength(2);
	});

	it("does not deduplicate when disabled", () => {
		const dupes: MultiSelectOption[] = [
			{ label: "A", value: "a" },
			{ label: "A2", value: "a" },
		];
		const result = flattenOptions(dupes, false);
		expect(result).toHaveLength(2);
	});
});

// ============================================================================
// filterOptions
// ============================================================================

describe("filterOptions", () => {
	const options: MultiSelectOption[] = [
		{ label: "Apple", value: "apple" },
		{ label: "Banana", value: "banana" },
		{ label: "Cherry", value: "cherry" },
	];

	it("returns all options when searchable is false", () => {
		expect(filterOptions(options, "app", false)).toEqual(options);
	});

	it("returns all options when search is empty", () => {
		expect(filterOptions(options, "", true)).toEqual(options);
	});

	it("returns empty for empty options", () => {
		expect(filterOptions([], "test", true)).toEqual([]);
	});

	it("filters by label (case insensitive)", () => {
		const result = filterOptions(options, "app", true) as MultiSelectOption[];
		expect(result).toHaveLength(1);
		expect(result[0]?.value).toBe("apple");
	});

	it("filters by value", () => {
		const result = filterOptions(options, "banana", true) as MultiSelectOption[];
		expect(result).toHaveLength(1);
		expect(result[0]?.label).toBe("Banana");
	});

	it("filters grouped options", () => {
		const groups: MultiSelectGroup[] = [
			{
				heading: "Fruits",
				options: [
					{ label: "Apple", value: "apple" },
					{ label: "Cherry", value: "cherry" },
				],
			},
			{
				heading: "Vegetables",
				options: [{ label: "Carrot", value: "carrot" }],
			},
		];
		const result = filterOptions(groups, "ch", true) as MultiSelectGroup[];
		expect(result).toHaveLength(1);
		expect(result[0]?.heading).toBe("Fruits");
		expect(result[0]?.options).toHaveLength(1);
		expect(result[0]?.options[0]?.value).toBe("cherry");
	});

	it("removes empty groups after filtering", () => {
		const groups: MultiSelectGroup[] = [
			{ heading: "G1", options: [{ label: "X", value: "x" }] },
			{ heading: "G2", options: [{ label: "Y", value: "y" }] },
		];
		const result = filterOptions(groups, "x", true) as MultiSelectGroup[];
		expect(result).toHaveLength(1);
		expect(result[0]?.heading).toBe("G1");
	});
});

// ============================================================================
// getWidthConstraints
// ============================================================================

describe("getWidthConstraints", () => {
	it("uses desktop defaults", () => {
		const result = getWidthConstraints("desktop");
		expect(result.minWidth).toBe("200px");
		expect(result.maxWidth).toBe("100%");
		expect(result.width).toBe("100%");
	});

	it("uses mobile defaults (0px minWidth)", () => {
		const result = getWidthConstraints("mobile");
		expect(result.minWidth).toBe("0px");
	});

	it("uses custom minWidth and maxWidth", () => {
		const result = getWidthConstraints("desktop", "300px", "500px");
		expect(result.minWidth).toBe("300px");
		expect(result.maxWidth).toBe("500px");
	});

	it("uses auto width when autoSize is true", () => {
		const result = getWidthConstraints("desktop", undefined, undefined, true);
		expect(result.width).toBe("auto");
	});

	it("uses 100% width when autoSize is false", () => {
		const result = getWidthConstraints("desktop", undefined, undefined, false);
		expect(result.width).toBe("100%");
	});
});
