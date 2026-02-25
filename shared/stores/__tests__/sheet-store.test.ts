import { describe, it, expect, beforeEach } from "vitest"

import { createSheetStore, defaultInitState } from "../sheet-store"
import type { SheetStore } from "../sheet-store"
import type { StoreApi } from "zustand/vanilla"

describe("createSheetStore", () => {
	let store: StoreApi<SheetStore>

	beforeEach(() => {
		store = createSheetStore()
	})

	describe("initial state", () => {
		it("should have openSheet = null", () => {
			expect(store.getState().openSheet).toBeNull()
		})

		it("should use default init state", () => {
			expect(store.getState().openSheet).toBe(defaultInitState.openSheet)
		})

		it("should accept custom init state", () => {
			const customStore = createSheetStore({ openSheet: "cart" })
			expect(customStore.getState().openSheet).toBe("cart")
		})
	})

	describe("open", () => {
		it("should set openSheet to the given sheetId", () => {
			store.getState().open("cart")
			expect(store.getState().openSheet).toBe("cart")
		})
	})

	describe("close", () => {
		it("should set openSheet to null", () => {
			store.getState().open("cart")
			store.getState().close()
			expect(store.getState().openSheet).toBeNull()
		})

		it("should be safe to call when already closed", () => {
			store.getState().close()
			expect(store.getState().openSheet).toBeNull()
		})
	})

	describe("toggle", () => {
		it("should open a closed sheet", () => {
			store.getState().toggle("cart")
			expect(store.getState().openSheet).toBe("cart")
		})

		it("should close an open sheet", () => {
			store.getState().open("cart")
			store.getState().toggle("cart")
			expect(store.getState().openSheet).toBeNull()
		})
	})

	describe("isOpen", () => {
		it("should return false when no sheet is open", () => {
			expect(store.getState().isOpen("cart")).toBe(false)
		})

		it("should return true when the sheet is open", () => {
			store.getState().open("cart")
			expect(store.getState().isOpen("cart")).toBe(true)
		})

		it("should return false after closing", () => {
			store.getState().open("cart")
			store.getState().close()
			expect(store.getState().isOpen("cart")).toBe(false)
		})
	})
})
