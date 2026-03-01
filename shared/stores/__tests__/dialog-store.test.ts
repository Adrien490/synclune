import { describe, it, expect, beforeEach } from "vitest";

import { createDialogStore, defaultInitState } from "../dialog-store";
import type { DialogStore } from "../dialog-store";
import type { StoreApi } from "zustand/vanilla";

describe("createDialogStore", () => {
	let store: StoreApi<DialogStore>;

	beforeEach(() => {
		store = createDialogStore();
	});

	describe("initial state", () => {
		it("should have empty dialogs", () => {
			expect(store.getState().dialogs).toEqual({});
		});

		it("should use default init state", () => {
			expect(store.getState().dialogs).toEqual(defaultInitState.dialogs);
		});

		it("should accept custom init state", () => {
			const customStore = createDialogStore({
				dialogs: { "test-dialog": { isOpen: true } },
			});
			expect(customStore.getState().dialogs["test-dialog"]?.isOpen).toBe(true);
		});
	});

	describe("openDialog", () => {
		it("should open a dialog by id", () => {
			store.getState().openDialog("confirm-delete");
			expect(store.getState().dialogs["confirm-delete"]?.isOpen).toBe(true);
		});

		it("should open a dialog with data", () => {
			const data = { itemId: "123", itemName: "Test" };
			store.getState().openDialog("confirm-delete", data);
			expect(store.getState().dialogs["confirm-delete"]?.isOpen).toBe(true);
			expect(store.getState().dialogs["confirm-delete"]?.data).toEqual(data);
		});

		it("should not affect other dialogs", () => {
			store.getState().openDialog("dialog-a");
			store.getState().openDialog("dialog-b");
			expect(store.getState().dialogs["dialog-a"]?.isOpen).toBe(true);
			expect(store.getState().dialogs["dialog-b"]?.isOpen).toBe(true);
		});
	});

	describe("closeDialog", () => {
		it("should close an open dialog", () => {
			store.getState().openDialog("test");
			store.getState().closeDialog("test");
			expect(store.getState().dialogs["test"]?.isOpen).toBe(false);
		});

		it("should preserve dialog data when closing", () => {
			const data = { itemId: "456" };
			store.getState().openDialog("test", data);
			store.getState().closeDialog("test");
			expect(store.getState().dialogs["test"]?.data).toEqual(data);
		});

		it("should not affect other dialogs when closing one", () => {
			store.getState().openDialog("dialog-a");
			store.getState().openDialog("dialog-b");
			store.getState().closeDialog("dialog-a");
			expect(store.getState().dialogs["dialog-a"]?.isOpen).toBe(false);
			expect(store.getState().dialogs["dialog-b"]?.isOpen).toBe(true);
		});
	});

	describe("toggleDialog", () => {
		it("should open a closed dialog", () => {
			store.getState().toggleDialog("test");
			expect(store.getState().dialogs["test"]?.isOpen).toBe(true);
		});

		it("should close an open dialog", () => {
			store.getState().openDialog("test");
			store.getState().toggleDialog("test");
			expect(store.getState().dialogs["test"]?.isOpen).toBe(false);
		});

		it("should preserve data when toggling", () => {
			const data = { itemId: "789" };
			store.getState().openDialog("test", data);
			store.getState().toggleDialog("test");
			expect(store.getState().dialogs["test"]?.data).toEqual(data);
		});
	});

	describe("isDialogOpen", () => {
		it("should return false for unknown dialog", () => {
			expect(store.getState().isDialogOpen("nonexistent")).toBe(false);
		});

		it("should return true for open dialog", () => {
			store.getState().openDialog("test");
			expect(store.getState().isDialogOpen("test")).toBe(true);
		});

		it("should return false for closed dialog", () => {
			store.getState().openDialog("test");
			store.getState().closeDialog("test");
			expect(store.getState().isDialogOpen("test")).toBe(false);
		});
	});

	describe("getDialogData", () => {
		it("should return undefined for unknown dialog", () => {
			expect(store.getState().getDialogData("nonexistent")).toBeUndefined();
		});

		it("should return data for dialog with data", () => {
			const data = { itemId: "test-id", extra: "value" };
			store.getState().openDialog("test", data);
			expect(store.getState().getDialogData("test")).toEqual(data);
		});

		it("should return undefined for dialog without data", () => {
			store.getState().openDialog("test");
			expect(store.getState().getDialogData("test")).toBeUndefined();
		});
	});

	describe("clearDialogData", () => {
		it("should clear data and close dialog", () => {
			store.getState().openDialog("test", { itemId: "123" });
			store.getState().clearDialogData("test");
			expect(store.getState().dialogs["test"]?.data).toBeUndefined();
			expect(store.getState().dialogs["test"]?.isOpen).toBe(false);
		});

		it("should be safe to call on unknown dialog", () => {
			store.getState().clearDialogData("nonexistent");
			expect(store.getState().dialogs["nonexistent"]?.isOpen).toBe(false);
			expect(store.getState().dialogs["nonexistent"]?.data).toBeUndefined();
		});
	});
});
