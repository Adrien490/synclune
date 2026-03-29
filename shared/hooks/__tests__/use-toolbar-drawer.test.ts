import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useToolbarDrawer } from "../use-toolbar-drawer";

type DrawerName = "sort" | "filter" | "search";

describe("useToolbarDrawer", () => {
	afterEach(cleanup);

	it("starts with no drawer open", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		expect(result.current.openDrawer).toBeNull();
		expect(result.current.isOpen("sort")).toBe(false);
		expect(result.current.isOpen("filter")).toBe(false);
	});

	it("opens a drawer", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		act(() => result.current.open("filter"));

		expect(result.current.openDrawer).toBe("filter");
		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("closes the open drawer", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		act(() => result.current.open("sort"));
		act(() => result.current.close());

		expect(result.current.openDrawer).toBeNull();
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("ensures mutual exclusion - opening B closes A", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		act(() => result.current.open("sort"));
		expect(result.current.isOpen("sort")).toBe(true);

		act(() => result.current.open("filter"));
		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("onOpenChange returns a handler that toggles the drawer", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		const handler = result.current.onOpenChange("search");

		// Open via handler
		act(() => handler(true));
		expect(result.current.isOpen("search")).toBe(true);

		// Close via handler
		act(() => handler(false));
		expect(result.current.isOpen("search")).toBe(false);
	});

	it("onOpenChange(name)(true) replaces any currently open drawer", () => {
		const { result } = renderHook(() => useToolbarDrawer<DrawerName>());

		act(() => result.current.open("sort"));

		const handler = result.current.onOpenChange("filter");
		act(() => handler(true));

		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});
});
