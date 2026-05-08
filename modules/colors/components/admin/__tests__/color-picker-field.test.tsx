import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { capturedProps } = vi.hoisted(() => ({
	capturedProps: {
		current: undefined as Record<string, unknown> | undefined,
	},
}));

vi.mock("@/shared/components/ui/color-picker", () => ({
	ColorPicker: (props: Record<string, unknown>) => {
		capturedProps.current = props;
		return (
			<div
				data-testid="color-picker-mock"
				data-value={String(props.value ?? "")}
				data-id={String(props.id ?? "")}
				data-disabled={props.disabled ? "true" : "false"}
				data-recent-key={String(props.recentStorageKey ?? "")}
			/>
		);
	},
}));

// Import AFTER mock is registered
import { JEWELRY_PALETTE } from "@/modules/colors/constants/jewelry-palette";

import { ColorPickerField } from "../color-picker-field";

afterEach(() => {
	cleanup();
	capturedProps.current = undefined;
});

describe("ColorPickerField", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("forwards value, id, disabled to ColorPicker", () => {
		render(<ColorPickerField value="#FF0000" onChange={() => {}} id="hex" disabled />);
		const root = screen.getByTestId("color-picker-mock");
		expect(root.getAttribute("data-value")).toBe("#FF0000");
		expect(root.getAttribute("data-id")).toBe("hex");
		expect(root.getAttribute("data-disabled")).toBe("true");
	});

	it("passes the JEWELRY_PALETTE as presets", () => {
		render(<ColorPickerField value="#000000" onChange={() => {}} />);
		expect(capturedProps.current?.presets).toBe(JEWELRY_PALETTE);
	});

	it("uses the admin recent-colors storage key", () => {
		render(<ColorPickerField value="#000000" onChange={() => {}} />);
		const root = screen.getByTestId("color-picker-mock");
		expect(root.getAttribute("data-recent-key")).toBe("synclune:admin:recent-colors");
	});

	it("forwards onChange callback", () => {
		const onChange = vi.fn();
		render(<ColorPickerField value="#000000" onChange={onChange} />);
		const forwarded = capturedProps.current?.onChange as ((hex: string) => void) | undefined;
		expect(typeof forwarded).toBe("function");
		forwarded?.("#ABCDEF");
		expect(onChange).toHaveBeenCalledWith("#ABCDEF");
	});

	it("forwards className", () => {
		render(<ColorPickerField value="#000000" onChange={() => {}} className="custom-class" />);
		expect(capturedProps.current?.className).toBe("custom-class");
	});
});
