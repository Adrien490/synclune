import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

// `react-phone-number-input` est mocké (bundle lourd, chargé en lazy), mais le
// mock INVOQUE `flagComponent` : c'est le seul moyen d'exercer réellement le
// calcul d'indicateurs régionaux de `FlagEmoji`. Un mock qui se contenterait de
// constater la présence de la prop serait aveugle à un décalage de codepoint.
vi.mock("react-phone-number-input", () => {
	const PhoneInput = ({
		value,
		onChange,
		placeholder,
		disabled,
		flags,
		flagComponent: Flag,
		...props
	}: any) => (
		<>
			<input
				type="tel"
				value={value ?? ""}
				onChange={(e) => onChange?.(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				data-testid="phone-input"
				data-has-flags={!!flags}
				data-has-flag-component={!!Flag}
				{...props}
			/>
			{Flag && (
				<>
					<span data-testid="flag-FR">
						<Flag country="FR" countryName="France" />
					</span>
					<span data-testid="flag-BE">
						<Flag country="BE" countryName="Belgique" />
					</span>
					<span data-testid="flag-DE">
						<Flag country="DE" countryName="Allemagne" />
					</span>
				</>
			)}
		</>
	);
	PhoneInput.displayName = "PhoneInput";
	return { default: PhoneInput };
});

// The CSS import will throw in jsdom without this mock
vi.mock("react-phone-number-input/style.css", () => ({}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import PhoneInputWithFlags from "../phone-input-lazy";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Attendu calculé depuis les codepoints Unicode EXPLICITES, pas depuis la
 * constante de décalage de l'implémentation — sinon le test rejouerait le bug.
 * U+1F1E6 = 🇦 (indicateur régional A).
 */
const REGIONAL_A = 0x1f1e6;
const expectedFlag = (code: string) =>
	String.fromCodePoint(...[...code].map((l) => REGIONAL_A + (l.charCodeAt(0) - "A".charCodeAt(0))));

// ============================================================================
// TESTS
// ============================================================================

describe("PhoneInputWithFlags (phone-input-lazy)", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders the phone input element", () => {
		render(<PhoneInputWithFlags value="" onChange={() => {}} />);
		expect(screen.getByTestId("phone-input")).toBeInTheDocument();
	});

	it("forwards arbitrary props to the underlying PhoneInput", () => {
		render(
			<PhoneInputWithFlags value="" onChange={() => {}} placeholder="+33 6 00 00 00 00" disabled />,
		);
		const input = screen.getByTestId("phone-input");
		expect(input).toHaveAttribute("placeholder", "+33 6 00 00 00 00");
		expect(input).toBeDisabled();
	});

	// ============================================================================
	// DRAPEAUX — emoji, pas les 272 SVG
	// ============================================================================

	it("passes a flagComponent instead of the heavy `flags` SVG map", () => {
		render(<PhoneInputWithFlags value="" onChange={() => {}} />);
		const input = screen.getByTestId("phone-input");
		expect(input).toHaveAttribute("data-has-flag-component", "true");
		// `flags` réintroduirait les 272 drapeaux de country-flag-icons (~58 Ko gzip,
		// non tree-shakables car consommés via l'export par défaut du barrel).
		expect(input).toHaveAttribute("data-has-flags", "false");
	});

	it.each([
		["FR", "France"],
		["BE", "Belgique"],
		["DE", "Allemagne"],
	])("renders %s as a regional-indicator flag emoji", (code, name) => {
		render(<PhoneInputWithFlags value="" onChange={() => {}} />);
		const slot = screen.getByTestId(`flag-${code}`);

		expect(slot).toHaveTextContent(expectedFlag(code));
		// Deux indicateurs régionaux = 4 unités UTF-16 (2 paires de substitution).
		expect(slot.textContent).toHaveLength(4);
		expect(slot.querySelector("span")).toHaveAttribute("title", name);
	});

	it("keeps the flag decorative — the <select> already announces the country", () => {
		render(<PhoneInputWithFlags value="" onChange={() => {}} />);
		const flag = screen.getByTestId("flag-FR").querySelector("span");
		expect(flag).toHaveAttribute("aria-hidden", "true");
	});
});
