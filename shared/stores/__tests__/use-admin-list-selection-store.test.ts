import { describe, it, expect, beforeEach, vi } from "vitest";

import { useAdminListSelectionStore } from "../use-admin-list-selection-store";
import type { AdminListSelectionControl } from "@/shared/types/store.types";

function makeControl(
	overrides: Partial<AdminListSelectionControl> = {},
): AdminListSelectionControl {
	return {
		selectionMode: false,
		pageHasItems: true,
		enter: vi.fn(),
		exit: vi.fn(),
		...overrides,
	};
}

describe("useAdminListSelectionStore", () => {
	// Reset the singleton store before each test (pattern Mail iOS — single mounted control)
	beforeEach(() => {
		useAdminListSelectionStore.getState().unregister();
	});

	it("starts with no registered control", () => {
		expect(useAdminListSelectionStore.getState().control).toBeNull();
	});

	it("register() publishes a control", () => {
		const control = makeControl();

		useAdminListSelectionStore.getState().register(control);

		expect(useAdminListSelectionStore.getState().control).toBe(control);
	});

	it("register() replaces a previously published control (one list active at a time)", () => {
		const first = makeControl({ selectionMode: false });
		const second = makeControl({ selectionMode: true });

		useAdminListSelectionStore.getState().register(first);
		useAdminListSelectionStore.getState().register(second);

		expect(useAdminListSelectionStore.getState().control).toBe(second);
	});

	it("unregister() clears the published control", () => {
		useAdminListSelectionStore.getState().register(makeControl());
		expect(useAdminListSelectionStore.getState().control).not.toBeNull();

		useAdminListSelectionStore.getState().unregister();

		expect(useAdminListSelectionStore.getState().control).toBeNull();
	});

	it("unregister() is a no-op when no control is registered", () => {
		useAdminListSelectionStore.getState().unregister();
		useAdminListSelectionStore.getState().unregister();

		expect(useAdminListSelectionStore.getState().control).toBeNull();
	});

	it("notifies subscribers on register/unregister", () => {
		const subscriber = vi.fn();
		const unsubscribe = useAdminListSelectionStore.subscribe(subscriber);
		const control = makeControl();

		useAdminListSelectionStore.getState().register(control);
		useAdminListSelectionStore.getState().unregister();

		expect(subscriber).toHaveBeenCalledTimes(2);
		unsubscribe();
	});

	it("preserves control identity (no shallow merge wrapping the object)", () => {
		const control = makeControl();

		useAdminListSelectionStore.getState().register(control);

		// We expect the same object reference — not a copy
		expect(useAdminListSelectionStore.getState().control).toBe(control);
	});

	it("control's enter/exit functions remain callable after registration", () => {
		const enter = vi.fn();
		const exit = vi.fn();
		const control = makeControl({ enter, exit });

		useAdminListSelectionStore.getState().register(control);

		const stored = useAdminListSelectionStore.getState().control;
		stored?.enter();
		stored?.exit();

		expect(enter).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledTimes(1);
	});
});
