import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockDeleteUploadThingFile, mockDeleteUploadThingFiles } = vi.hoisted(() => ({
	mockDeleteUploadThingFile: vi.fn(),
	mockDeleteUploadThingFiles: vi.fn(),
}));

vi.mock("@/modules/media/actions/delete-uploadthing-file", () => ({
	deleteUploadThingFile: mockDeleteUploadThingFile,
}));

vi.mock("@/modules/media/actions/delete-uploadthing-files", () => ({
	deleteUploadThingFiles: mockDeleteUploadThingFiles,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useDeleteUploadThingFile } from "../use-delete-uploadthing-file";
import { useDeleteUploadThingFiles } from "../use-delete-uploadthing-files";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Fichier supprime" };
const ERROR = { status: "error" as const, message: "Erreur suppression" };

afterEach(cleanup);

// ============================================================================
// useDeleteUploadThingFile
// ============================================================================

describe("useDeleteUploadThingFile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteUploadThingFile.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteUploadThingFile());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useDeleteUploadThingFile());

		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUploadThingFile({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Fichier supprime");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteUploadThingFile.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUploadThingFile({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", () => {
		const { result } = renderHook(() => useDeleteUploadThingFile());

		expect(result.current.state).toBeUndefined();
	});

	it("passes FormData through the action", async () => {
		const { result } = renderHook(() => useDeleteUploadThingFile());
		const formData = new FormData();
		formData.append("fileUrl", "https://example.com/file.jpg");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockDeleteUploadThingFile).toHaveBeenCalledTimes(1);
		const receivedFormData = mockDeleteUploadThingFile.mock.calls[0]?.[1] as FormData;
		expect(receivedFormData.get("fileUrl")).toBe("https://example.com/file.jpg");
	});
});

// ============================================================================
// useDeleteUploadThingFiles
// ============================================================================

describe("useDeleteUploadThingFiles", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteUploadThingFiles.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and deleteFiles", () => {
		const { result } = renderHook(() => useDeleteUploadThingFiles());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deleteFiles).toBe("function");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useDeleteUploadThingFiles());

		expect(result.current.isPending).toBe(false);
	});

	it("deleteFiles wraps a single string URL in an array and sends JSON", async () => {
		const { result } = renderHook(() => useDeleteUploadThingFiles());

		await act(async () => {
			result.current.deleteFiles("https://example.com/file.jpg");
		});

		expect(mockDeleteUploadThingFiles).toHaveBeenCalledTimes(1);
		const formData = mockDeleteUploadThingFiles.mock.calls[0]?.[1] as FormData;
		expect(formData.get("fileUrls")).toBe(JSON.stringify(["https://example.com/file.jpg"]));
	});

	it("deleteFiles sends multiple URLs as JSON array", async () => {
		const { result } = renderHook(() => useDeleteUploadThingFiles());
		const urls = ["https://example.com/file1.jpg", "https://example.com/file2.jpg"];

		await act(async () => {
			result.current.deleteFiles(urls);
		});

		const formData = mockDeleteUploadThingFiles.mock.calls[0]?.[1] as FormData;
		expect(formData.get("fileUrls")).toBe(JSON.stringify(urls));
	});

	it("deleteFiles handles an empty array", async () => {
		const { result } = renderHook(() => useDeleteUploadThingFiles());

		await act(async () => {
			result.current.deleteFiles([]);
		});

		const formData = mockDeleteUploadThingFiles.mock.calls[0]?.[1] as FormData;
		expect(formData.get("fileUrls")).toBe(JSON.stringify([]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUploadThingFiles({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Fichier supprime");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteUploadThingFiles.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUploadThingFiles({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
