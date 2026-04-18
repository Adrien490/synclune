import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Listener = () => void;

function createNavigatorStub(initial: boolean) {
	const listeners: Record<string, Listener[]> = { online: [], offline: [] };
	const navigator = { onLine: initial };
	const window = {
		addEventListener: vi.fn((event: string, cb: Listener) => {
			(listeners[event] ??= []).push(cb);
		}),
		removeEventListener: vi.fn((event: string, cb: Listener) => {
			const list = listeners[event];
			if (!list) return;
			const idx = list.indexOf(cb);
			if (idx !== -1) list.splice(idx, 1);
		}),
	};
	return {
		navigator,
		window,
		listeners,
		setOnline(value: boolean) {
			navigator.onLine = value;
			const event = value ? "online" : "offline";
			for (const cb of listeners[event] ?? []) cb();
		},
	};
}

let stub: ReturnType<typeof createNavigatorStub>;

beforeEach(() => {
	stub = createNavigatorStub(true);
	vi.stubGlobal("navigator", stub.navigator);
	vi.stubGlobal("addEventListener", stub.window.addEventListener);
	vi.stubGlobal("removeEventListener", stub.window.removeEventListener);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

import { useOnlineStatus } from "../use-online-status";

describe("useOnlineStatus", () => {
	it("returns navigator.onLine snapshot on mount", () => {
		const { result } = renderHook(() => useOnlineStatus());
		expect(result.current).toBe(true);
	});

	it("reacts to offline event", () => {
		const { result } = renderHook(() => useOnlineStatus());
		expect(result.current).toBe(true);

		act(() => {
			stub.setOnline(false);
		});

		expect(result.current).toBe(false);
	});

	it("reacts to online event", () => {
		stub.navigator.onLine = false;
		const { result } = renderHook(() => useOnlineStatus());
		expect(result.current).toBe(false);

		act(() => {
			stub.setOnline(true);
		});

		expect(result.current).toBe(true);
	});

	it("subscribes to both online and offline events", () => {
		renderHook(() => useOnlineStatus());
		expect(stub.window.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
		expect(stub.window.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
	});

	it("removes both listeners on unmount", () => {
		const { unmount } = renderHook(() => useOnlineStatus());
		unmount();
		expect(stub.window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
		expect(stub.window.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
	});
});
