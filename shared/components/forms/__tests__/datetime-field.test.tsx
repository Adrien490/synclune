import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, type, disabled, "aria-label": ariaLabel, ...props }: any) => (
		<button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/calendar", () => ({
	Calendar: ({ onSelect }: any) => (
		<div data-testid="calendar">
			<button
				type="button"
				onClick={() => onSelect(new Date("2025-06-15T00:00:00"))}
				data-testid="calendar-day"
			>
				15
			</button>
			<button type="button" onClick={() => onSelect(undefined)} data-testid="calendar-clear">
				Effacer
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	FieldError: ({ errors }: any) =>
		errors?.length > 0 ? <div role="alert">{errors[0]?.message ?? errors[0]}</div> : null,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ id, type, value, onChange, disabled, ...props }: any) => (
		<input id={id} type={type} value={value} onChange={onChange} disabled={disabled} {...props} />
	),
	inputVariants: () => "input-styles",
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children }: any) => <div>{children}</div>,
	PopoverTrigger: ({ children }: any) => <>{children}</>,
	PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock("./field-label", () => ({
	FieldLabel: ({ children, required, optional }: any) => (
		<label>
			{children}
			{required && <span aria-hidden="true">*</span>}
			{optional && !required && <span>(Optionnel)</span>}
		</label>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CalendarBlankIcon: () => <svg data-testid="calendar-icon" />,
	XIcon: () => <svg data-testid="x-icon" />,
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("date-fns", () => ({
	format: (date: Date, formatStr: string) => {
		if (formatStr.includes("HH:mm")) return "15 juin 2025 à 00:00";
		return "15 juin 2025";
	},
}));

// ============================================================================
// FORM CONTEXT MOCK
// ============================================================================

const { fakeFormStore } = vi.hoisted(() => {
	const fakeFormStore = {
		state: { submissionAttempts: 0 },
		get: () => fakeFormStore.state,
		subscribe: () => ({ unsubscribe: () => {} }),
	};
	return { fakeFormStore };
});

const mockHandleChange = vi.fn();
const mockHandleBlur = vi.fn();

const createFieldState = (value: string, errors: any[] = []) => ({
	state: { value, meta: { errors, isBlurred: true } },
	name: "scheduledAt",
	form: { store: fakeFormStore },
	handleChange: mockHandleChange,
	handleBlur: mockHandleBlur,
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DateTimeField } from "../datetime-field";
import { useFieldContext } from "@/shared/lib/form-context";

const mockUseFieldContext = vi.mocked(useFieldContext);

// ============================================================================
// TESTS
// ============================================================================

describe("DateTimeField", () => {
	afterEach(() => {
		cleanup();
		mockHandleChange.mockClear();
	});

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders placeholder text when no date is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<DateTimeField placeholder="Choisir une date" />);
		expect(screen.getByText("Choisir une date")).toBeInTheDocument();
	});

	it("renders label when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<DateTimeField label="Date de début" />);
		expect(screen.getByText("Date de début")).toBeInTheDocument();
	});

	it("renders calendar icon in trigger button", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<DateTimeField />);
		expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
	});

	// ============================================================================
	// DATE PICKER
	// ============================================================================

	it("calls handleChange with formatted ISO string when a date is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<DateTimeField />);
		fireEvent.click(screen.getByTestId("calendar-day"));
		expect(mockHandleChange).toHaveBeenCalledOnce();
		const calledWith = mockHandleChange.mock.calls[0]?.[0] as string;
		expect(calledWith).toMatch(/^2025-06-15T/);
	});

	// ============================================================================
	// TIME PICKER
	// ============================================================================

	it("shows time input when a date is selected and dateOnly is false", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField />);
		const timeInput = screen.getByLabelText("Heure");
		expect(timeInput).toBeInTheDocument();
		expect(timeInput).toHaveAttribute("type", "time");
	});

	it("does not show time input when dateOnly is true", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField dateOnly />);
		expect(screen.queryByLabelText("Heure")).toBeNull();
	});

	it("calls handleChange with updated time when time input changes", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField />);
		const timeInput = screen.getByLabelText("Heure");
		fireEvent.change(timeInput, { target: { value: "09:45" } });
		expect(mockHandleChange).toHaveBeenCalledOnce();
		const calledWith = mockHandleChange.mock.calls[0]?.[0] as string;
		expect(calledWith).toMatch(/T09:45$/);
	});

	// ============================================================================
	// CLEAR / RESET
	// ============================================================================

	it("renders clear buttons when a date is selected and not disabled", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField />);
		// Both mobile and desktop branches render a clear button
		const clearButtons = screen.getAllByRole("button", { name: "Effacer la date" });
		expect(clearButtons.length).toBe(2);
	});

	it("clears value by calling handleChange with empty string when clear button clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField />);
		const clearButtons = screen.getAllByRole("button", { name: "Effacer la date" });
		fireEvent.click(clearButtons[0]!);
		expect(mockHandleChange).toHaveBeenCalledWith("");
	});

	it("does not render clear button when no date is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<DateTimeField />);
		expect(screen.queryByRole("button", { name: "Effacer la date" })).toBeNull();
	});

	it("does not render clear button when field is disabled", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField disabled />);
		expect(screen.queryByRole("button", { name: "Effacer la date" })).toBeNull();
	});

	// ============================================================================
	// COMBINED VALUE DISPLAY
	// ============================================================================

	it("displays formatted date when a date is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		render(<DateTimeField />);
		expect(screen.getByText("15 juin 2025 à 00:00")).toBeInTheDocument();
	});

	it("renders hidden input with current field value for form submission", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		const { container } = render(<DateTimeField />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden).toBeInTheDocument();
		expect(hidden.value).toBe("2025-06-15T14:30");
	});

	// ============================================================================
	// NATIVE MOBILE INPUT
	// ============================================================================

	it("renders native datetime-local input for mobile", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]');
		expect(nativeInput).toBeInTheDocument();
	});

	it("renders native date input for mobile when dateOnly", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField dateOnly />);
		const nativeInput = container.querySelector('input[type="date"]');
		expect(nativeInput).toBeInTheDocument();
	});

	it("native input has correct value for datetime-local", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		expect(nativeInput.value).toBe("2025-06-15T14:30");
	});

	it("native input has date-only value when dateOnly", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		const { container } = render(<DateTimeField dateOnly />);
		const nativeInput = container.querySelector('input[type="date"]') as HTMLInputElement;
		expect(nativeInput.value).toBe("2025-06-15");
	});

	it("native input calls handleChange with datetime-local value", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		fireEvent.change(nativeInput, { target: { value: "2025-06-15T09:45" } });
		expect(mockHandleChange).toHaveBeenCalledWith("2025-06-15T09:45");
	});

	it("native date input preserves time in lastTimeRef", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField dateOnly />);
		const nativeInput = container.querySelector('input[type="date"]') as HTMLInputElement;
		fireEvent.change(nativeInput, { target: { value: "2025-06-15" } });
		expect(mockHandleChange).toHaveBeenCalledWith("2025-06-15T00:00");
	});

	it("native input clears value on empty change", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("2025-06-15T14:30") as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		fireEvent.change(nativeInput, { target: { value: "" } });
		expect(mockHandleChange).toHaveBeenCalledWith("");
	});

	it("native input forwards disabled attribute", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField disabled />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		expect(nativeInput).toBeDisabled();
	});

	it("native input forwards required attribute", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField required />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		expect(nativeInput).toBeRequired();
	});

	it("native input has aria-invalid when errors exist", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("", ["Required"]) as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		expect(nativeInput).toHaveAttribute("aria-invalid", "true");
		expect(nativeInput).toHaveAttribute("aria-describedby", "scheduledAt-error");
	});

	it("native input calls handleBlur on blur", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		const { container } = render(<DateTimeField />);
		const nativeInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
		fireEvent.blur(nativeInput);
		expect(mockHandleBlur).toHaveBeenCalledOnce();
	});
});
