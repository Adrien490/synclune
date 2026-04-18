import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useFocusFirstError } from "../use-focus-first-error";

const vibrateMock = vi.fn();

beforeEach(() => {
	vibrateMock.mockClear();
	Object.defineProperty(navigator, "vibrate", {
		configurable: true,
		value: vibrateMock,
	});
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: () => false,
			onchange: null,
		}),
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

function mountForm() {
	const { result } = renderHook(() => useFocusFirstError());

	const form = document.createElement("form");
	const inputA = document.createElement("input");
	inputA.setAttribute("data-testid", "field-a");
	inputA.setAttribute("aria-invalid", "false");
	const inputB = document.createElement("input");
	inputB.setAttribute("data-testid", "field-b");
	inputB.setAttribute("aria-invalid", "true");
	const inputC = document.createElement("input");
	inputC.setAttribute("data-testid", "field-c");
	inputC.setAttribute("aria-invalid", "true");
	form.append(inputA, inputB, inputC);
	document.body.append(form);

	act(() => {
		(result.current.formRef as React.RefObject<HTMLFormElement | null>).current = form;
	});

	return { result, form, inputA, inputB, inputC };
}

describe("useFocusFirstError", () => {
	it("focuses the first aria-invalid=true element on focusFirstInvalid()", () => {
		HTMLElement.prototype.scrollIntoView = vi.fn();
		const { result, inputB } = mountForm();

		let returned = false;
		act(() => {
			returned = result.current.focusFirstInvalid();
		});

		expect(returned).toBe(true);
		expect(document.activeElement).toBe(inputB);
		expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
			block: "center",
			behavior: "smooth",
		});
		expect(vibrateMock).toHaveBeenCalled();
	});

	it("returns false when no invalid field is present", () => {
		const { result } = renderHook(() => useFocusFirstError());
		const form = document.createElement("form");
		const input = document.createElement("input");
		input.setAttribute("aria-invalid", "false");
		form.append(input);
		document.body.append(form);
		act(() => {
			(result.current.formRef as React.RefObject<HTMLFormElement | null>).current = form;
		});

		expect(result.current.focusFirstInvalid()).toBe(false);
	});

	it("onInvalidCapture focuses the native-invalid target once per 300ms window", () => {
		HTMLElement.prototype.scrollIntoView = vi.fn();
		const { result, inputB, inputC } = mountForm();

		const event1 = new Event("invalid", { bubbles: true });
		Object.defineProperty(event1, "target", { value: inputB });

		act(() => {
			result.current.onInvalidCapture(event1 as unknown as React.FormEvent<HTMLFormElement>);
		});
		expect(document.activeElement).toBe(inputB);

		const event2 = new Event("invalid", { bubbles: true });
		Object.defineProperty(event2, "target", { value: inputC });

		act(() => {
			result.current.onInvalidCapture(event2 as unknown as React.FormEvent<HTMLFormElement>);
		});
		expect(document.activeElement).toBe(inputB);
	});
});
