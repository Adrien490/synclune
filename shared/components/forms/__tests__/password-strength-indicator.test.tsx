import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS (real password-strength utils, no mock)
// ============================================================================

import { PasswordStrengthIndicator } from "../password-strength-indicator";

describe("PasswordStrengthIndicator", () => {
	afterEach(cleanup);

	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	it("returns null when password is empty", () => {
		const { container } = render(<PasswordStrengthIndicator password="" />);
		expect(container.innerHTML).toBe("");
	});

	// ============================================================================
	// PROGRESSBAR
	// ============================================================================

	it("renders progressbar with correct aria attributes", () => {
		render(<PasswordStrengthIndicator password="abc" />);
		const progressbar = screen.getByRole("progressbar");
		expect(progressbar).toHaveAttribute("aria-valuemin", "0");
		expect(progressbar).toHaveAttribute("aria-valuemax", "3");
		expect(progressbar).toHaveAttribute("aria-valuenow", "0");
	});

	it("shows level 0 (Trop court) for short password", () => {
		render(<PasswordStrengthIndicator password="ab" />);
		const progressbar = screen.getByRole("progressbar");
		expect(progressbar).toHaveAttribute("aria-valuenow", "0");
		expect(progressbar).toHaveAttribute("aria-label", "Force du mot de passe");
		// `aria-valuetext` porte le libellé : sans lui l'échelle 0-3 serait
		// vocalisée en chiffres bruts, dénués de sens.
		expect(progressbar).toHaveAttribute("aria-valuetext", "Trop court");
		expect(screen.getByText("Trop court")).toBeInTheDocument();
	});

	it("shows level 3 (Fort) for strong password", () => {
		render(<PasswordStrengthIndicator password="Abcdefg1!" />);
		const progressbar = screen.getByRole("progressbar");
		expect(progressbar).toHaveAttribute("aria-valuenow", "3");
		expect(screen.getByText("Fort")).toBeInTheDocument();
	});

	// ============================================================================
	// WIDTH PROGRESSION
	// ============================================================================

	it("renders 0% width for level 0", () => {
		render(<PasswordStrengthIndicator password="ab" />);
		const progressbar = screen.getByRole("progressbar");
		const bar = progressbar.firstElementChild as HTMLElement;
		expect(bar.style.width).toBe("0%");
	});

	it("renders 100% width for level 3", () => {
		render(<PasswordStrengthIndicator password="Abcdefg1!" />);
		const progressbar = screen.getByRole("progressbar");
		const bar = progressbar.firstElementChild as HTMLElement;
		expect(bar.style.width).toMatch(/100%/);
	});

	// ============================================================================
	// LABEL COLORS
	// ============================================================================

	it("uses destructive color for level < 2", () => {
		render(<PasswordStrengthIndicator password="ab" />);
		const label = screen.getByText("Trop court");
		expect(label.className).toContain("text-destructive");
	});

	it("uses warning color for level = 2", () => {
		render(<PasswordStrengthIndicator password="Abcdefgh" />);
		const label = screen.getByText("Moyen");
		expect(label.className).toContain("text-warning");
	});

	it("uses success color for level >= 3", () => {
		render(<PasswordStrengthIndicator password="Abcdefg1!" />);
		const label = screen.getByText("Fort");
		expect(label.className).toContain("text-success");
	});

	// ============================================================================
	// RULES CHECKLIST
	// ============================================================================

	it("renders rules checklist with aria-label", () => {
		render(<PasswordStrengthIndicator password="abc" />);
		const list = screen.getByRole("list", { name: "Critères du mot de passe" });
		expect(list).toBeInTheDocument();
		const items = within(list).getAllByRole("listitem");
		expect(items).toHaveLength(3);
	});

	it("shows sr-only '(validé)' text for satisfied rules", () => {
		render(<PasswordStrengthIndicator password="Abcdefg1!" />);
		const validTexts = screen.getAllByText("(validé)");
		expect(validTexts.length).toBe(3);
		for (const el of validTexts) {
			expect(el).toHaveClass("sr-only");
		}
	});

	// ============================================================================
	// ARIA-LIVE
	// ============================================================================

	/**
	 * La région live est volontairement RESTREINTE au seul libellé de force.
	 *
	 * Elle enveloppait auparavant tout le widget, liste des 4 critères comprise ;
	 * comme le composant est piloté par la valeur brute du champ, chaque frappe
	 * reconstruisait l'annonce entière — un flot de parole continu pendant la
	 * saisie d'un mot de passe sous VoiceOver/TalkBack.
	 */
	it("annonce le libellé de force via une région live dédiée", () => {
		render(<PasswordStrengthIndicator password="abc" />);
		const label = screen.getByText("Trop court");
		expect(label).toHaveAttribute("aria-live", "polite");
		expect(label).toHaveAttribute("aria-atomic", "true");
	});

	it("ne place PAS la liste des critères dans une région live", () => {
		render(<PasswordStrengthIndicator password="abc" />);
		const criteria = screen.getByRole("list", { name: "Critères du mot de passe" });
		expect(criteria.closest("[aria-live]")).toBeNull();
	});
});
