import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// IMPORTS
// ============================================================================

import { MULTI_SELECT_LABELS, multiSelectVariants } from "../constants";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	vi.clearAllMocks();
});

describe("MULTI_SELECT_LABELS", () => {
	it("provides the default placeholder", () => {
		expect(MULTI_SELECT_LABELS.placeholder).toBe("Sélectionner");
	});

	it("provides Select All label", () => {
		expect(MULTI_SELECT_LABELS.selectAll).toBe("Tout sélectionner");
	});

	it("provides Clear All label", () => {
		expect(MULTI_SELECT_LABELS.clearAll).toBe("Effacer");
	});

	it("provides Close and Finish labels", () => {
		expect(MULTI_SELECT_LABELS.close).toBe("Fermer");
		expect(MULTI_SELECT_LABELS.finish).toBe("Terminer");
	});

	it("pluralizes selectionCount", () => {
		expect(MULTI_SELECT_LABELS.selectionCount(1)).toBe("1 sélectionné");
		expect(MULTI_SELECT_LABELS.selectionCount(3)).toBe("3 sélectionnés");
	});

	it("formats moreItems count", () => {
		expect(MULTI_SELECT_LABELS.moreItems(4)).toBe("+ 4");
	});

	it("formats removeItem with label", () => {
		expect(MULTI_SELECT_LABELS.removeItem("Rouge")).toBe("Retirer Rouge");
	});

	it("formats clearSelection with count", () => {
		expect(MULTI_SELECT_LABELS.clearSelection(3)).toContain("3 options");
	});

	it("formats ariaComboboxLabel with count/total/placeholder", () => {
		const label = MULTI_SELECT_LABELS.ariaComboboxLabel(2, 5, "Choisir");
		expect(label).toContain("2 sur 5");
		expect(label).toContain("Choisir");
	});

	it("provides ariaNoSelection fallback", () => {
		expect(MULTI_SELECT_LABELS.ariaNoSelection).toBe("Aucune option sélectionnée");
	});
});

describe("multiSelectVariants (CVA)", () => {
	it("returns default variant classes when called with no variant", () => {
		const classes = multiSelectVariants();
		expect(classes).toContain("border-foreground/10");
	});

	it("returns secondary variant classes", () => {
		const classes = multiSelectVariants({ variant: "secondary" });
		expect(classes).toContain("bg-secondary");
	});

	it("returns destructive variant classes", () => {
		const classes = multiSelectVariants({ variant: "destructive" });
		expect(classes).toContain("bg-destructive");
	});

	it("always includes motion-safe transition base classes", () => {
		expect(multiSelectVariants()).toContain("motion-safe:transition-colors");
	});
});
