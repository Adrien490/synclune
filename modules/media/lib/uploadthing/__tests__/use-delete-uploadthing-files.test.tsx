import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDeleteAction, mockDeleteFileAction, mockCreateToastCallbacks, mockWithCallbacks } =
	vi.hoisted(() => ({
		mockDeleteAction: vi.fn(),
		mockDeleteFileAction: vi.fn(),
		mockCreateToastCallbacks: vi.fn((options: unknown) => ({ toastOptions: options })),
		mockWithCallbacks: vi.fn(
			(action: unknown, _callbacks: unknown) => action as (...args: unknown[]) => unknown,
		),
	}));

vi.mock("@/modules/media/actions/delete-uploadthing-files", () => ({
	deleteUploadThingFiles: mockDeleteAction,
}));
vi.mock("@/modules/media/actions/delete-uploadthing-file", () => ({
	deleteUploadThingFile: mockDeleteFileAction,
}));
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: mockCreateToastCallbacks,
}));
vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: mockWithCallbacks,
}));

// Import after mocks
import { useDeleteUploadThingFiles } from "../use-delete-uploadthing-files";
import { useDeleteUploadThingFile } from "../use-delete-uploadthing-file";

describe("useDeleteUploadThingFiles", () => {
	beforeEach(() => {
		mockDeleteAction.mockReset();
		mockDeleteFileAction.mockReset();
		mockCreateToastCallbacks.mockClear();
		mockWithCallbacks.mockClear();
	});

	afterEach(() => {
		cleanup();
	});

	it("wires the action through withCallbacks with the right toast config", () => {
		function Harness() {
			useDeleteUploadThingFiles();
			return null;
		}
		render(<Harness />);
		expect(mockCreateToastCallbacks).toHaveBeenCalledOnce();
		const config = mockCreateToastCallbacks.mock.calls[0]?.[0] as {
			showSuccessToast: boolean;
			showErrorToast: boolean;
		};
		expect(config.showSuccessToast).toBe(false);
		expect(config.showErrorToast).toBe(true);
		expect(mockWithCallbacks).toHaveBeenCalledWith(mockDeleteAction, expect.any(Object));
	});

	it("deleteFiles() submits a FormData with JSON-serialized URLs", () => {
		function Harness() {
			const { deleteFiles } = useDeleteUploadThingFiles();
			return (
				<button onClick={() => deleteFiles(["https://a.com/1", "https://a.com/2"])}>delete</button>
			);
		}
		render(<Harness />);
		fireEvent.click(screen.getByText("delete"));
		expect(mockDeleteAction).toHaveBeenCalledOnce();
		const formData = mockDeleteAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("fileUrls")).toBe(JSON.stringify(["https://a.com/1", "https://a.com/2"]));
	});

	it("deleteFiles() accepts a single string and wraps it in an array", () => {
		function Harness() {
			const { deleteFiles } = useDeleteUploadThingFiles();
			return <button onClick={() => deleteFiles("https://a.com/1")}>delete</button>;
		}
		render(<Harness />);
		fireEvent.click(screen.getByText("delete"));
		const formData = mockDeleteAction.mock.calls[0]?.[1] as FormData;
		expect(formData.get("fileUrls")).toBe(JSON.stringify(["https://a.com/1"]));
	});

	it("exposes isPending and state from useActionState", () => {
		function Harness() {
			const { isPending } = useDeleteUploadThingFiles();
			return <span data-testid="pending">{isPending ? "yes" : "no"}</span>;
		}
		render(<Harness />);
		expect(screen.getByTestId("pending").textContent).toBe("no");
	});
});

describe("useDeleteUploadThingFile", () => {
	beforeEach(() => {
		mockDeleteFileAction.mockReset();
		mockCreateToastCallbacks.mockClear();
		mockWithCallbacks.mockClear();
	});

	afterEach(() => {
		cleanup();
	});

	it("wires the single-file action through withCallbacks", () => {
		function Harness() {
			useDeleteUploadThingFile();
			return null;
		}
		render(<Harness />);
		expect(mockWithCallbacks).toHaveBeenCalledWith(mockDeleteFileAction, expect.any(Object));
	});

	it("propagates onSuccess when the action result carries a message", () => {
		const onSuccess = vi.fn();
		function Harness() {
			useDeleteUploadThingFile({ onSuccess });
			return null;
		}
		render(<Harness />);
		const toastConfig = mockCreateToastCallbacks.mock.calls[0]?.[0] as {
			onSuccess: (result: unknown) => void;
		};
		toastConfig.onSuccess({ message: "Fichier supprimé" });
		expect(onSuccess).toHaveBeenCalledWith("Fichier supprimé");
	});

	it("does not invoke onSuccess when result has no message", () => {
		const onSuccess = vi.fn();
		function Harness() {
			useDeleteUploadThingFile({ onSuccess });
			return null;
		}
		render(<Harness />);
		const toastConfig = mockCreateToastCallbacks.mock.calls[0]?.[0] as {
			onSuccess: (result: unknown) => void;
		};
		toastConfig.onSuccess({ status: "ok" });
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
