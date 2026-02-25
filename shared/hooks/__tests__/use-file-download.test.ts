import { renderHook } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useFileDownload } from "../use-file-download"
import { downloadCSV, downloadJSON, downloadBlob } from "@/shared/utils/file-download"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useFileDownload", () => {
	it("returns an object with downloadCSV, downloadJSON, and downloadBlob functions", () => {
		const { result } = renderHook(() => useFileDownload())

		expect(typeof result.current.downloadCSV).toBe("function")
		expect(typeof result.current.downloadJSON).toBe("function")
		expect(typeof result.current.downloadBlob).toBe("function")
	})

	it("returns the same function references as the direct utility imports", () => {
		const { result } = renderHook(() => useFileDownload())

		expect(result.current.downloadCSV).toBe(downloadCSV)
		expect(result.current.downloadJSON).toBe(downloadJSON)
		expect(result.current.downloadBlob).toBe(downloadBlob)
	})
})
