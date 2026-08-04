import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretDownIcon: (props: Record<string, unknown>) => (
		<svg data-testid="chevron-icon" aria-hidden="true" data-slot={props["data-slot"] as string} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from "../native-select";

// ============================================================================
// NativeSelect
// ============================================================================

describe("NativeSelect", () => {
	afterEach(cleanup);

	it("renders select with data-slot='native-select'", () => {
		render(<NativeSelect />);
		const select = document.querySelector("[data-slot='native-select']");
		expect(select).toBeInTheDocument();
	});

	it("wrapper has data-slot='native-select-wrapper'", () => {
		render(<NativeSelect />);
		const wrapper = document.querySelector("[data-slot='native-select-wrapper']");
		expect(wrapper).toBeInTheDocument();
	});

	it("ChevronDownIcon has aria-hidden='true'", () => {
		render(<NativeSelect />);
		const icon = document.querySelector("[data-slot='native-select-icon']");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("ChevronDownIcon has data-slot='native-select-icon'", () => {
		render(<NativeSelect />);
		const icon = document.querySelector("[data-slot='native-select-icon']");
		expect(icon).toBeInTheDocument();
	});

	it("wrapper has w-fit class when no w-full in className", () => {
		render(<NativeSelect className="my-class" />);
		const wrapper = document.querySelector("[data-slot='native-select-wrapper']");
		expect(wrapper?.className).toContain("w-fit");
	});

	it("wrapper has w-full class when className contains w-full", () => {
		render(<NativeSelect className="w-full" />);
		const wrapper = document.querySelector("[data-slot='native-select-wrapper']");
		expect(wrapper?.className).toContain("w-full");
	});

	it("renders children options inside select", () => {
		render(
			<NativeSelect>
				<option value="a">Option A</option>
				<option value="b">Option B</option>
			</NativeSelect>,
		);
		expect(screen.getByText("Option A")).toBeInTheDocument();
		expect(screen.getByText("Option B")).toBeInTheDocument();
	});
});

// ============================================================================
// NativeSelectOption
// ============================================================================

describe("NativeSelectOption", () => {
	afterEach(cleanup);

	it("has data-slot='native-select-option'", () => {
		render(
			<select>
				<NativeSelectOption value="x">X</NativeSelectOption>
			</select>,
		);
		const option = document.querySelector("[data-slot='native-select-option']");
		expect(option).toBeInTheDocument();
	});
});

// ============================================================================
// NativeSelectOptGroup
// ============================================================================

describe("NativeSelectOptGroup", () => {
	afterEach(cleanup);

	it("has data-slot='native-select-optgroup'", () => {
		render(
			<select>
				<NativeSelectOptGroup label="Group A">
					<option value="a">A</option>
				</NativeSelectOptGroup>
			</select>,
		);
		const optgroup = document.querySelector("[data-slot='native-select-optgroup']");
		expect(optgroup).toBeInTheDocument();
	});
});
