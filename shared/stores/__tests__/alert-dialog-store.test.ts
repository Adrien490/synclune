import { describe, it, expect, beforeEach, vi } from "vitest"

import { createAlertDialogStore, defaultInitState } from "../alert-dialog-store"
import type { AlertDialogStore } from "../alert-dialog-store"
import type { StoreApi } from "zustand/vanilla"

describe("createAlertDialogStore", () => {
	let store: StoreApi<AlertDialogStore>

	beforeEach(() => {
		store = createAlertDialogStore()
	})

	describe("initial state", () => {
		it("should have empty alertDialogs", () => {
			expect(store.getState().alertDialogs).toEqual({})
		})

		it("should use default init state", () => {
			expect(store.getState().alertDialogs).toEqual(defaultInitState.alertDialogs)
		})

		it("should accept custom init state", () => {
			const customStore = createAlertDialogStore({
				alertDialogs: { "delete-confirm": { isOpen: true } },
			})
			expect(customStore.getState().alertDialogs["delete-confirm"]?.isOpen).toBe(true)
		})
	})

	describe("openAlertDialog", () => {
		it("should open an alert dialog by id", () => {
			store.getState().openAlertDialog("delete-order")
			expect(store.getState().alertDialogs["delete-order"]?.isOpen).toBe(true)
		})

		it("should open with data including itemId and itemName", () => {
			const data = { itemId: "order-123", itemName: "Commande #456" }
			store.getState().openAlertDialog("delete-order", data)
			expect(store.getState().alertDialogs["delete-order"]?.data).toEqual(data)
		})

		it("should open with an action callback", () => {
			const action = vi.fn()
			store.getState().openAlertDialog("confirm", { action })
			expect(store.getState().alertDialogs["confirm"]?.data?.action).toBe(action)
		})

		it("should allow multiple alert dialogs open simultaneously", () => {
			store.getState().openAlertDialog("alert-a")
			store.getState().openAlertDialog("alert-b")
			expect(store.getState().alertDialogs["alert-a"]?.isOpen).toBe(true)
			expect(store.getState().alertDialogs["alert-b"]?.isOpen).toBe(true)
		})
	})

	describe("closeAlertDialog", () => {
		it("should close an open alert dialog", () => {
			store.getState().openAlertDialog("test")
			store.getState().closeAlertDialog("test")
			expect(store.getState().alertDialogs["test"]?.isOpen).toBe(false)
		})

		it("should preserve data when closing", () => {
			const data = { itemId: "123" }
			store.getState().openAlertDialog("test", data)
			store.getState().closeAlertDialog("test")
			expect(store.getState().alertDialogs["test"]?.data).toEqual(data)
		})

		it("should not affect other alert dialogs", () => {
			store.getState().openAlertDialog("alert-a")
			store.getState().openAlertDialog("alert-b")
			store.getState().closeAlertDialog("alert-a")
			expect(store.getState().alertDialogs["alert-a"]?.isOpen).toBe(false)
			expect(store.getState().alertDialogs["alert-b"]?.isOpen).toBe(true)
		})
	})

	describe("isAlertDialogOpen", () => {
		it("should return false for unknown alert dialog", () => {
			expect(store.getState().isAlertDialogOpen("nonexistent")).toBe(false)
		})

		it("should return true for open alert dialog", () => {
			store.getState().openAlertDialog("test")
			expect(store.getState().isAlertDialogOpen("test")).toBe(true)
		})

		it("should return false after closing", () => {
			store.getState().openAlertDialog("test")
			store.getState().closeAlertDialog("test")
			expect(store.getState().isAlertDialogOpen("test")).toBe(false)
		})
	})

	describe("getAlertDialogData", () => {
		it("should return undefined for unknown dialog", () => {
			expect(store.getState().getAlertDialogData("nonexistent")).toBeUndefined()
		})

		it("should return typed data", () => {
			const data = { itemId: "sku-789", itemName: "Bague Lune" }
			store.getState().openAlertDialog("delete", data)

			const retrieved = store.getState().getAlertDialogData<typeof data>("delete")
			expect(retrieved?.itemId).toBe("sku-789")
			expect(retrieved?.itemName).toBe("Bague Lune")
		})

		it("should return undefined for dialog without data", () => {
			store.getState().openAlertDialog("test")
			expect(store.getState().getAlertDialogData("test")).toBeUndefined()
		})
	})

	describe("clearAlertDialogData", () => {
		it("should clear data and close alert dialog", () => {
			store.getState().openAlertDialog("test", { itemId: "abc" })
			store.getState().clearAlertDialogData("test")
			expect(store.getState().alertDialogs["test"]?.data).toBeUndefined()
			expect(store.getState().alertDialogs["test"]?.isOpen).toBe(false)
		})
	})
})
