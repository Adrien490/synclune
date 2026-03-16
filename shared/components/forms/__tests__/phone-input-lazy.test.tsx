import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Mock react-phone-number-input and its flags (heavy bundle, lazy loaded)
vi.mock("react-phone-number-input", () => {
	const PhoneInput = ({ value, onChange, placeholder, disabled, flags, ...props }: any) => (
		<input
			type="tel"
			value={value ?? ""}
			onChange={(e) => onChange?.(e.target.value)}
			placeholder={placeholder}
			disabled={disabled}
			data-testid="phone-input"
			data-has-flags={!!flags}
			{...props}
		/>
	);
	PhoneInput.displayName = "PhoneInput";
	return { default: PhoneInput };
});

vi.mock("react-phone-number-input/flags", () => ({
	default: { FR: () => <span data-testid="flag-fr" /> },
}));

// The CSS import will throw in jsdom without this mock
vi.mock("react-phone-number-input/style.css", () => ({}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import PhoneInputWithFlags from "../phone-input-lazy";

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

	it("passes flags prop to the underlying PhoneInput", () => {
		render(<PhoneInputWithFlags value="" onChange={() => {}} />);
		expect(screen.getByTestId("phone-input")).toHaveAttribute("data-has-flags", "true");
	});

	it("forwards arbitrary props to the underlying PhoneInput", () => {
		render(
			<PhoneInputWithFlags value="" onChange={() => {}} placeholder="+33 6 00 00 00 00" disabled />,
		);
		const input = screen.getByTestId("phone-input");
		expect(input).toHaveAttribute("placeholder", "+33 6 00 00 00 00");
		expect(input).toBeDisabled();
	});
});
