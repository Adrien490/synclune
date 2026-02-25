import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useRadioGroupKeyboard } from "../use-radio-group-keyboard"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Option {
	id: string
	label: string
	disabled?: boolean
}

const OPTIONS: Option[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta" },
	{ id: "c", label: "Gamma" },
	{ id: "d", label: "Delta" },
]

function makeKeyEvent(key: string): React.KeyboardEvent {
	return {
		key,
		preventDefault: vi.fn(),
	} as unknown as React.KeyboardEvent
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useRadioGroupKeyboard", () => {
	let onSelect: ReturnType<typeof vi.fn>

	beforeEach(() => {
		onSelect = vi.fn()
	})

	// -------------------------------------------------------------------------
	// Return value
	// -------------------------------------------------------------------------

	describe("return value", () => {
		it("returns containerRef and handleKeyDown", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			expect(result.current.containerRef).toBeDefined()
			expect(typeof result.current.handleKeyDown).toBe("function")
		})
	})

	// -------------------------------------------------------------------------
	// Arrow key navigation
	// -------------------------------------------------------------------------

	describe("ArrowDown navigation", () => {
		it("moves to the next option when ArrowDown is pressed", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			const event = makeKeyEvent("ArrowDown")
			result.current.handleKeyDown(event, 0)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[1])
			expect(event.preventDefault).toHaveBeenCalled()
		})

		it("wraps around to the first option from the last", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), OPTIONS.length - 1)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0])
		})
	})

	describe("ArrowUp navigation", () => {
		it("moves to the previous option when ArrowUp is pressed", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			const event = makeKeyEvent("ArrowUp")
			result.current.handleKeyDown(event, 2)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[1])
			expect(event.preventDefault).toHaveBeenCalled()
		})

		it("wraps around to the last option when ArrowUp is pressed at the first", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowUp"), 0)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[OPTIONS.length - 1])
		})
	})

	describe("ArrowRight / ArrowLeft navigation", () => {
		it("ArrowRight behaves the same as ArrowDown", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowRight"), 1)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[2])
		})

		it("ArrowLeft behaves the same as ArrowUp", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowLeft"), 1)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0])
		})
	})

	// -------------------------------------------------------------------------
	// Disabled options
	// -------------------------------------------------------------------------

	describe("skips disabled options", () => {
		it("skips a disabled option when navigating forward", () => {
			const optionsWithDisabled: Option[] = [
				{ id: "a", label: "Alpha" },
				{ id: "b", label: "Beta", disabled: true },
				{ id: "c", label: "Gamma" },
			]

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: optionsWithDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), 0)

			// Should skip index 1 (disabled) and land on index 2
			expect(onSelect).toHaveBeenCalledWith(optionsWithDisabled[2])
		})

		it("does not call onSelect when all options are disabled", () => {
			const allDisabled: Option[] = [
				{ id: "a", label: "Alpha", disabled: true },
				{ id: "b", label: "Beta", disabled: true },
			]

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: allDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), 0)

			expect(onSelect).not.toHaveBeenCalled()
		})
	})

	// -------------------------------------------------------------------------
	// Home / End navigation
	// -------------------------------------------------------------------------

	describe("Home key", () => {
		it("moves to the first option", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			const event = makeKeyEvent("Home")
			result.current.handleKeyDown(event, 3)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0])
			expect(event.preventDefault).toHaveBeenCalled()
		})

		it("skips disabled options when finding the first option", () => {
			const optionsWithFirstDisabled: Option[] = [
				{ id: "a", label: "Alpha", disabled: true },
				{ id: "b", label: "Beta" },
				{ id: "c", label: "Gamma" },
			]

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: optionsWithFirstDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("Home"), 2)

			expect(onSelect).toHaveBeenCalledWith(optionsWithFirstDisabled[1])
		})
	})

	describe("End key", () => {
		it("moves to the last option", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			const event = makeKeyEvent("End")
			result.current.handleKeyDown(event, 0)

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[OPTIONS.length - 1])
			expect(event.preventDefault).toHaveBeenCalled()
		})
	})

	// -------------------------------------------------------------------------
	// Unhandled keys
	// -------------------------------------------------------------------------

	describe("unhandled keys", () => {
		it("does not call onSelect for unrelated keys", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				})
			)

			result.current.handleKeyDown(makeKeyEvent("Enter"), 0)
			result.current.handleKeyDown(makeKeyEvent(" "), 0)
			result.current.handleKeyDown(makeKeyEvent("Tab"), 0)

			expect(onSelect).not.toHaveBeenCalled()
		})
	})
})
