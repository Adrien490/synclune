import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import {
	ARIA_CLEAR_DELAY,
	FOCUS_RING_DURATION,
	MULTI_SELECT_LABELS,
	BADGE_ANIMATION_CLASSES,
	POPOVER_ANIMATION_CLASSES,
	DEFAULT_RESPONSIVE_CONFIG,
	DEFAULT_NON_RESPONSIVE_SETTINGS,
	SCREEN_BREAKPOINTS,
	getScreenSize,
	multiSelectVariants,
} from "../constants";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	vi.clearAllMocks();
});

describe("Timing constants", () => {
	it("ARIA_CLEAR_DELAY is 100ms", () => {
		expect(ARIA_CLEAR_DELAY).toBe(100);
	});

	it("FOCUS_RING_DURATION is 1000ms", () => {
		expect(FOCUS_RING_DURATION).toBe(1000);
	});
});

describe("SCREEN_BREAKPOINTS", () => {
	it("mobile breakpoint is 640", () => {
		expect(SCREEN_BREAKPOINTS.mobile).toBe(640);
	});

	it("tablet breakpoint is 1024", () => {
		expect(SCREEN_BREAKPOINTS.tablet).toBe(1024);
	});
});

describe("getScreenSize", () => {
	it("returns 'mobile' for widths below 640", () => {
		expect(getScreenSize(320)).toBe("mobile");
		expect(getScreenSize(639)).toBe("mobile");
	});

	it("returns 'tablet' for widths between 640 and 1023", () => {
		expect(getScreenSize(640)).toBe("tablet");
		expect(getScreenSize(1023)).toBe("tablet");
	});

	it("returns 'desktop' for widths 1024 and above", () => {
		expect(getScreenSize(1024)).toBe("desktop");
		expect(getScreenSize(1920)).toBe("desktop");
	});

	it("returns 'mobile' at width 0", () => {
		expect(getScreenSize(0)).toBe("mobile");
	});
});

describe("MULTI_SELECT_LABELS", () => {
	it("placeholder is 'Sélectionner'", () => {
		expect(MULTI_SELECT_LABELS.placeholder).toBe("Sélectionner");
	});

	it("selectAll is 'Tout sélectionner'", () => {
		expect(MULTI_SELECT_LABELS.selectAll).toBe("Tout sélectionner");
	});

	it("selectAllWithCount returns condensed text for >20 items", () => {
		expect(MULTI_SELECT_LABELS.selectAllWithCount(21)).toContain("21 éléments");
	});

	it("selectAllWithCount returns 'Tout sélectionner' for ≤20 items", () => {
		expect(MULTI_SELECT_LABELS.selectAllWithCount(20)).toBe("Tout sélectionner");
	});

	it("moreItems formats correctly", () => {
		expect(MULTI_SELECT_LABELS.moreItems(5)).toBe("+ 5 de plus");
	});

	it("removeItem formats correctly", () => {
		expect(MULTI_SELECT_LABELS.removeItem("Rouge")).toBe("Retirer Rouge de la sélection");
	});

	it("removeExtra formats correctly", () => {
		expect(MULTI_SELECT_LABELS.removeExtra(3)).toBe("Retirer les 3 options supplémentaires");
	});

	it("clearSelection formats correctly", () => {
		expect(MULTI_SELECT_LABELS.clearSelection(4)).toBe("Effacer les 4 options sélectionnées");
	});

	it("noResultsFor formats the search term", () => {
		expect(MULTI_SELECT_LABELS.noResultsFor("test")).toBe('Aucun résultat pour "test"');
	});

	it("ariaSelected formats count and total", () => {
		expect(MULTI_SELECT_LABELS.ariaSelected("Rouge", 2, 10)).toBe(
			"Rouge sélectionné. 2 sur 10 options.",
		);
	});

	it("ariaMultipleAdded formats added, count, and total", () => {
		expect(MULTI_SELECT_LABELS.ariaMultipleAdded(3, 5, 10)).toBe("3 options ajoutées. 5 sur 10.");
	});

	it("ariaRemoved formats count and total", () => {
		expect(MULTI_SELECT_LABELS.ariaRemoved(2, 10)).toBe("Option retirée. 2 sur 10 options.");
	});

	it("ariaListOpen formats total", () => {
		expect(MULTI_SELECT_LABELS.ariaListOpen(15)).toBe(
			"Liste ouverte. 15 options. Flèches pour naviguer.",
		);
	});

	it("ariaListClosed is 'Liste fermée.'", () => {
		expect(MULTI_SELECT_LABELS.ariaListClosed).toBe("Liste fermée.");
	});

	it("ariaSearchResults singular", () => {
		expect(MULTI_SELECT_LABELS.ariaSearchResults(1, "rouge")).toBe('1 résultat pour "rouge"');
	});

	it("ariaSearchResults plural", () => {
		expect(MULTI_SELECT_LABELS.ariaSearchResults(3, "bleu")).toBe('3 résultats pour "bleu"');
	});

	it("ariaComboboxLabel formats count, total, placeholder", () => {
		const result = MULTI_SELECT_LABELS.ariaComboboxLabel(2, 10, "Sélectionner");
		expect(result).toContain("2 sur 10");
		expect(result).toContain("Sélectionner");
	});

	it("ariaSelectAllOptions formats count", () => {
		expect(MULTI_SELECT_LABELS.ariaSelectAllOptions(7)).toBe("Sélectionner les 7 options");
	});

	it("ariaSelectionCount singular", () => {
		const result = MULTI_SELECT_LABELS.ariaSelectionCount(1, "Rouge");
		expect(result).toContain("1 option");
		expect(result).toContain("sélectionnée :");
		expect(result).toContain("Rouge");
	});

	it("ariaSelectionCount plural", () => {
		const result = MULTI_SELECT_LABELS.ariaSelectionCount(3, "Rouge, Bleu, Vert");
		expect(result).toContain("3 options");
		expect(result).toContain("sélectionnées :");
	});
});

describe("BADGE_ANIMATION_CLASSES", () => {
	it("bounce has translate and scale classes", () => {
		expect(BADGE_ANIMATION_CLASSES.bounce).toContain("hover:");
	});

	it("none is an empty string", () => {
		expect(BADGE_ANIMATION_CLASSES.none).toBe("");
	});

	it("all animation types are present", () => {
		const types = ["bounce", "pulse", "wiggle", "fade", "slide", "none"] as const;
		for (const type of types) {
			expect(BADGE_ANIMATION_CLASSES).toHaveProperty(type);
		}
	});
});

describe("POPOVER_ANIMATION_CLASSES", () => {
	it("none is an empty string", () => {
		expect(POPOVER_ANIMATION_CLASSES.none).toBe("");
	});

	it("all animation types are present", () => {
		const types = ["scale", "slide", "fade", "flip", "none"] as const;
		for (const type of types) {
			expect(POPOVER_ANIMATION_CLASSES).toHaveProperty(type);
		}
	});
});

describe("DEFAULT_RESPONSIVE_CONFIG", () => {
	it("mobile maxCount is 2", () => {
		expect(DEFAULT_RESPONSIVE_CONFIG.mobile.maxCount).toBe(2);
	});

	it("mobile compactMode is true", () => {
		expect(DEFAULT_RESPONSIVE_CONFIG.mobile.compactMode).toBe(true);
	});

	it("tablet maxCount is 4", () => {
		expect(DEFAULT_RESPONSIVE_CONFIG.tablet.maxCount).toBe(4);
	});

	it("desktop maxCount is 6", () => {
		expect(DEFAULT_RESPONSIVE_CONFIG.desktop.maxCount).toBe(6);
	});
});

describe("DEFAULT_NON_RESPONSIVE_SETTINGS", () => {
	it("maxCount is 3", () => {
		expect(DEFAULT_NON_RESPONSIVE_SETTINGS.maxCount).toBe(3);
	});

	it("hideIcons is false", () => {
		expect(DEFAULT_NON_RESPONSIVE_SETTINGS.hideIcons).toBe(false);
	});

	it("compactMode is false", () => {
		expect(DEFAULT_NON_RESPONSIVE_SETTINGS.compactMode).toBe(false);
	});
});

describe("multiSelectVariants", () => {
	it("returns a class string for default variant", () => {
		const result = multiSelectVariants({ variant: "default" });
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("returns a class string for secondary variant", () => {
		const result = multiSelectVariants({ variant: "secondary" });
		expect(result).toContain("secondary");
	});

	it("includes base transition classes", () => {
		const result = multiSelectVariants({});
		expect(result).toContain("transition-all");
	});
});
