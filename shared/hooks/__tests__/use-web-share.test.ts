import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useWebShare } from "../use-web-share";

describe("useWebShare", () => {
	const shareData = { title: "Test", url: "https://example.com" };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(cleanup);

	it("canShare is true when navigator.share exists", () => {
		Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true });
		const { result } = renderHook(() => useWebShare());
		expect(result.current.canShare).toBe(true);
	});

	it("canShare is false when navigator.share is absent", () => {
		// @ts-expect-error -- removing share for test
		delete navigator.share;
		const { result } = renderHook(() => useWebShare());
		expect(result.current.canShare).toBe(false);
	});

	it('share() returns "shared" when navigator.share resolves', async () => {
		Object.defineProperty(navigator, "share", {
			value: vi.fn().mockResolvedValue(undefined),
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.share(shareData);
		});
		expect(outcome).toBe("shared");
	});

	it('share() returns "dismissed" on AbortError (user cancel)', async () => {
		const abortError = new DOMException("User cancelled", "AbortError");
		Object.defineProperty(navigator, "share", {
			value: vi.fn().mockRejectedValue(abortError),
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.share(shareData);
		});
		expect(outcome).toBe("dismissed");
	});

	it('share() falls back to clipboard and returns "copied" on non-AbortError', async () => {
		Object.defineProperty(navigator, "share", {
			value: vi.fn().mockRejectedValue(new Error("NotAllowed")),
			configurable: true,
		});
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.share(shareData);
		});
		expect(outcome).toBe("copied");
		expect(writeText).toHaveBeenCalledWith(shareData.url);
	});

	it('share() falls back to clipboard and returns "copied" when canShare is false', async () => {
		// @ts-expect-error -- removing share for test
		delete navigator.share;
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.share(shareData);
		});
		expect(outcome).toBe("copied");
		expect(writeText).toHaveBeenCalledWith(shareData.url);
	});

	it('share() returns "dismissed" when both share and clipboard fail', async () => {
		Object.defineProperty(navigator, "share", {
			value: vi.fn().mockRejectedValue(new Error("fail")),
			configurable: true,
		});
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.share(shareData);
		});
		expect(outcome).toBe("dismissed");
	});

	it("clipboard.writeText receives data.url", async () => {
		// @ts-expect-error -- removing share for test
		delete navigator.share;
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { result } = renderHook(() => useWebShare());

		await act(async () => {
			await result.current.share({ title: "T", url: "https://synclune.fr/p" });
		});
		expect(writeText).toHaveBeenCalledWith("https://synclune.fr/p");
	});
});
