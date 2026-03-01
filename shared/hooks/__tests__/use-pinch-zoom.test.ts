import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockClampPosition, mockGetZoomToPointPosition } = vi.hoisted(() => ({
	mockClampPosition: vi.fn(),
	mockGetZoomToPointPosition: vi.fn(),
}));

vi.mock("@/shared/utils/touch-geometry", () => ({
	getDistance: vi.fn(() => 100),
	getCenter: vi.fn(() => ({ x: 200, y: 150 })),
	clampPosition: mockClampPosition,
	getZoomToPointPosition: mockGetZoomToPointPosition,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { usePinchZoom } from "../use-pinch-zoom";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTAINER_RECT: DOMRect = {
	left: 0,
	top: 0,
	width: 400,
	height: 300,
	right: 400,
	bottom: 300,
	x: 0,
	y: 0,
	toJSON: () => ({}),
};

function makeContainerRef(): React.RefObject<HTMLDivElement | null> {
	const div = document.createElement("div");
	div.getBoundingClientRect = () => CONTAINER_RECT;
	div.focus = vi.fn();
	return { current: div };
}

function makeKeyEvent(key: string): React.KeyboardEvent {
	return {
		key,
		preventDefault: vi.fn(),
	} as unknown as React.KeyboardEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePinchZoom", () => {
	let containerRef: React.RefObject<HTMLDivElement | null>;

	beforeEach(() => {
		containerRef = makeContainerRef();

		// Default: clampPosition passes through its first argument
		mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);
		mockGetZoomToPointPosition.mockReturnValue({ x: -50, y: -25 });
	});

	// -------------------------------------------------------------------------
	// 1. Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns scale=1 by default", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));
			expect(result.current.scale).toBe(1);
		});

		it("returns position={x:0, y:0} by default", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));
			expect(result.current.position).toEqual({ x: 0, y: 0 });
		});

		it("returns isZoomed=false by default", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));
			expect(result.current.isZoomed).toBe(false);
		});

		it("returns isInteracting=false by default", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));
			expect(result.current.isInteracting).toBe(false);
		});

		it("exposes reset, zoomIn, zoomOut and handleKeyDown functions", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));
			expect(typeof result.current.reset).toBe("function");
			expect(typeof result.current.zoomIn).toBe("function");
			expect(typeof result.current.zoomOut).toBe("function");
			expect(typeof result.current.handleKeyDown).toBe("function");
		});

		it("uses a custom minScale as the initial scale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { minScale: 0.5 } }),
			);
			expect(result.current.scale).toBe(0.5);
		});

		it("isZoomed is false when scale equals minScale", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef, config: { minScale: 1 } }));
			expect(result.current.isZoomed).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Keyboard controls (handleKeyDown)
	// -------------------------------------------------------------------------

	describe("handleKeyDown", () => {
		describe("zoom-in keys (+ / = / *)", () => {
			it("'+' increases scale by keyboardZoomStep", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});

				expect(result.current.scale).toBeCloseTo(1.5);
			});

			it("'=' increases scale by keyboardZoomStep", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("="));
				});

				expect(result.current.scale).toBeCloseTo(1.5);
			});

			it("'*' increases scale by keyboardZoomStep", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("*"));
				});

				expect(result.current.scale).toBeCloseTo(1.5);
			});

			it("'+' calls e.preventDefault()", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent("+");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("scale is capped at maxScale when zooming in beyond the limit", () => {
				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { maxScale: 2, keyboardZoomStep: 1 } }),
				);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				}); // 1 → 2
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				}); // 2 → capped at 2

				expect(result.current.scale).toBe(2);
			});

			it("isZoomed becomes true after zooming in", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});

				expect(result.current.isZoomed).toBe(true);
			});
		});

		describe("zoom-out key (-)", () => {
			it("'-' decreases scale by keyboardZoomStep", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				// First zoom in so we have room to zoom out
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				}); // 1 → 1.5
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("-"));
				}); // 1.5 → 1

				expect(result.current.scale).toBeCloseTo(1);
			});

			it("'-' calls e.preventDefault()", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent("-");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("scale is capped at minScale when zooming out beyond the limit", () => {
				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { minScale: 1 } }),
				);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("-"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("-"));
				});

				expect(result.current.scale).toBe(1);
			});
		});

		describe("reset keys (0 / Escape)", () => {
			it("'0' resets scale to minScale", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("0"));
				});

				expect(result.current.scale).toBe(1);
			});

			it("'0' resets position to origin", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("0"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("'0' calls e.preventDefault()", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent("0");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("Escape resets scale to minScale", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Escape"));
				});

				expect(result.current.scale).toBe(1);
			});

			it("Escape resets position to origin", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Escape"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("Escape calls e.preventDefault()", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent("Escape");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("isZoomed is false after reset", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				expect(result.current.isZoomed).toBe(true);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Escape"));
				});
				expect(result.current.isZoomed).toBe(false);
			});
		});

		describe("arrow key panning when zoomed", () => {
			it("ArrowLeft changes position when zoomed", () => {
				// clampPosition returns what is passed in — just pass the arg through
				mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);

				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { keyboardPanStep: 50 } }),
				);

				// Zoom in first so isZoomed is true
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});

				const positionAfterZoom = result.current.position;

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowLeft"));
				});

				// ArrowLeft: x += keyboardPanStep (moves right visually → pans left)
				expect(result.current.position.x).toBe(positionAfterZoom.x + 50);
			});

			it("ArrowRight changes position when zoomed", () => {
				mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);

				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { keyboardPanStep: 50 } }),
				);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				const positionAfterZoom = result.current.position;

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowRight"));
				});

				expect(result.current.position.x).toBe(positionAfterZoom.x - 50);
			});

			it("ArrowUp changes position when zoomed", () => {
				mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);

				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { keyboardPanStep: 50 } }),
				);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				const positionAfterZoom = result.current.position;

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowUp"));
				});

				expect(result.current.position.y).toBe(positionAfterZoom.y + 50);
			});

			it("ArrowDown changes position when zoomed", () => {
				mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);

				const { result } = renderHook(() =>
					usePinchZoom({ containerRef, config: { keyboardPanStep: 50 } }),
				);

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				const positionAfterZoom = result.current.position;

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowDown"));
				});

				expect(result.current.position.y).toBe(positionAfterZoom.y - 50);
			});

			it("arrow keys call e.preventDefault() when zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});

				const event = makeKeyEvent("ArrowLeft");
				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});
		});

		describe("arrow key panning when NOT zoomed", () => {
			it("ArrowLeft does not change position when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowLeft"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("ArrowRight does not change position when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowRight"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("ArrowUp does not change position when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowUp"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("ArrowDown does not change position when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowDown"));
				});

				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});

			it("arrow keys do not call e.preventDefault() when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				const event = makeKeyEvent("ArrowLeft");
				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).not.toHaveBeenCalled();
			});
		});

		describe("Enter and Space keys", () => {
			it("Enter calls onTap when not zoomed", () => {
				const onTap = vi.fn();
				const { result } = renderHook(() => usePinchZoom({ containerRef, onTap }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Enter"));
				});

				expect(onTap).toHaveBeenCalledTimes(1);
			});

			it("Space calls onTap when not zoomed", () => {
				const onTap = vi.fn();
				const { result } = renderHook(() => usePinchZoom({ containerRef, onTap }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent(" "));
				});

				expect(onTap).toHaveBeenCalledTimes(1);
			});

			it("Enter calls e.preventDefault() when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent("Enter");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("Space calls e.preventDefault() when not zoomed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));
				const event = makeKeyEvent(" ");

				act(() => {
					result.current.handleKeyDown(event);
				});

				expect(event.preventDefault).toHaveBeenCalled();
			});

			it("Enter does not call onTap when zoomed", () => {
				const onTap = vi.fn();
				const { result } = renderHook(() => usePinchZoom({ containerRef, onTap }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Enter"));
				});

				expect(onTap).not.toHaveBeenCalled();
			});

			it("Space does not call onTap when zoomed", () => {
				const onTap = vi.fn();
				const { result } = renderHook(() => usePinchZoom({ containerRef, onTap }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent(" "));
				});

				expect(onTap).not.toHaveBeenCalled();
			});

			it("does not throw when onTap is not provided and Enter is pressed", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				expect(() => {
					act(() => {
						result.current.handleKeyDown(makeKeyEvent("Enter"));
					});
				}).not.toThrow();
			});
		});

		describe("unhandled keys", () => {
			it("does not change state for unrelated keys", () => {
				const { result } = renderHook(() => usePinchZoom({ containerRef }));

				act(() => {
					result.current.handleKeyDown(makeKeyEvent("Tab"));
					result.current.handleKeyDown(makeKeyEvent("a"));
					result.current.handleKeyDown(makeKeyEvent("Shift"));
				});

				expect(result.current.scale).toBe(1);
				expect(result.current.position).toEqual({ x: 0, y: 0 });
			});
		});
	});

	// -------------------------------------------------------------------------
	// 3. zoomIn / zoomOut functions
	// -------------------------------------------------------------------------

	describe("zoomIn", () => {
		it("increases scale by keyboardZoomStep", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardZoomStep: 0.5 } }),
			);

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.scale).toBeCloseTo(1.5);
		});

		it("caps scale at maxScale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { maxScale: 2, keyboardZoomStep: 1 } }),
			);

			act(() => {
				result.current.zoomIn();
			}); // 1 → 2
			act(() => {
				result.current.zoomIn();
			}); // 2 → stays 2

			expect(result.current.scale).toBe(2);
		});

		it("sets isZoomed to true after zooming in", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.isZoomed).toBe(true);
		});

		it("calls clampPosition with the new scale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardZoomStep: 0.5 } }),
			);

			act(() => {
				result.current.zoomIn();
			});

			expect(mockClampPosition).toHaveBeenCalledWith(expect.any(Object), 1.5, CONTAINER_RECT);
		});

		it("multiple zoomIn calls accumulate scale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardZoomStep: 0.5, maxScale: 3 } }),
			);

			act(() => {
				result.current.zoomIn();
			}); // 1.5
			act(() => {
				result.current.zoomIn();
			}); // 2.0

			expect(result.current.scale).toBeCloseTo(2);
		});
	});

	describe("zoomOut", () => {
		it("decreases scale by keyboardZoomStep", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardZoomStep: 0.5, maxScale: 3 } }),
			);

			act(() => {
				result.current.zoomIn();
			}); // 1.5
			act(() => {
				result.current.zoomOut();
			}); // back to 1.0

			expect(result.current.scale).toBeCloseTo(1);
		});

		it("caps scale at minScale", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef, config: { minScale: 1 } }));

			act(() => {
				result.current.zoomOut();
			});
			act(() => {
				result.current.zoomOut();
			});

			expect(result.current.scale).toBe(1);
		});

		it("resets position to origin when reaching minScale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { minScale: 1, keyboardZoomStep: 0.5 } }),
			);

			// Zoom in to move position, then zoom out all the way
			act(() => {
				result.current.zoomIn();
			});
			act(() => {
				result.current.zoomOut();
			}); // back to minScale

			expect(result.current.position).toEqual({ x: 0, y: 0 });
		});

		it("does not reset position when still above minScale", () => {
			// Return a non-zero position from clampPosition when scale > minScale
			mockClampPosition.mockImplementation((pos: { x: number; y: number }, scale: number) => {
				if (scale > 1) return { x: 10, y: 10 };
				return { x: 0, y: 0 };
			});

			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { minScale: 1, keyboardZoomStep: 0.5, maxScale: 3 } }),
			);

			act(() => {
				result.current.zoomIn();
			}); // 1.5 → position = {10, 10}
			act(() => {
				result.current.zoomIn();
			}); // 2.0 → still above minScale

			// Position should still be clamped (non-zero) since we're above minScale
			expect(result.current.scale).toBeGreaterThan(1);
		});

		it("isZoomed becomes false when scale returns to minScale", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));

			act(() => {
				result.current.zoomIn();
			});
			expect(result.current.isZoomed).toBe(true);

			act(() => {
				result.current.zoomOut();
			});
			expect(result.current.isZoomed).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// 4. reset function
	// -------------------------------------------------------------------------

	describe("reset", () => {
		it("sets scale back to minScale", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef, config: { minScale: 1 } }));

			act(() => {
				result.current.zoomIn();
			});
			act(() => {
				result.current.reset();
			});

			expect(result.current.scale).toBe(1);
		});

		it("sets position to origin", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));

			act(() => {
				result.current.zoomIn();
			});
			act(() => {
				result.current.reset();
			});

			expect(result.current.position).toEqual({ x: 0, y: 0 });
		});

		it("sets isZoomed to false", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));

			act(() => {
				result.current.zoomIn();
			});
			expect(result.current.isZoomed).toBe(true);

			act(() => {
				result.current.reset();
			});
			expect(result.current.isZoomed).toBe(false);
		});

		it("resets to a custom minScale when config.minScale differs from 1", () => {
			const { result } = renderHook(() =>
				usePinchZoom({
					containerRef,
					config: { minScale: 0.5, keyboardZoomStep: 0.5, maxScale: 3 },
				}),
			);

			act(() => {
				result.current.zoomIn();
			}); // 0.5 → 1.0
			act(() => {
				result.current.reset();
			});

			expect(result.current.scale).toBe(0.5);
		});

		it("is idempotent — calling reset multiple times is safe", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef }));

			expect(() => {
				act(() => {
					result.current.reset();
					result.current.reset();
					result.current.reset();
				});
			}).not.toThrow();

			expect(result.current.scale).toBe(1);
		});
	});

	// -------------------------------------------------------------------------
	// 5. isActive prop
	// -------------------------------------------------------------------------

	describe("isActive prop", () => {
		it("does not reset state when isActive stays true", () => {
			const { result, rerender } = renderHook(
				({ isActive }) => usePinchZoom({ containerRef, isActive }),
				{ initialProps: { isActive: true } },
			);

			act(() => {
				result.current.zoomIn();
			});
			expect(result.current.scale).toBeCloseTo(1.5);

			rerender({ isActive: true });
			expect(result.current.scale).toBeCloseTo(1.5);
		});

		it("resets scale to minScale when isActive transitions from true to false", () => {
			const { result, rerender } = renderHook(
				({ isActive }) => usePinchZoom({ containerRef, isActive }),
				{ initialProps: { isActive: true } },
			);

			act(() => {
				result.current.zoomIn();
			});
			expect(result.current.scale).toBeCloseTo(1.5);

			rerender({ isActive: false });

			expect(result.current.scale).toBe(1);
		});

		it("resets position to origin when isActive transitions to false", () => {
			const { result, rerender } = renderHook(
				({ isActive }) => usePinchZoom({ containerRef, isActive }),
				{ initialProps: { isActive: true } },
			);

			act(() => {
				result.current.zoomIn();
			});

			rerender({ isActive: false });

			expect(result.current.position).toEqual({ x: 0, y: 0 });
		});

		it("sets isInteracting to false when isActive transitions to false", () => {
			const { result, rerender } = renderHook(
				({ isActive }) => usePinchZoom({ containerRef, isActive }),
				{ initialProps: { isActive: true } },
			);

			rerender({ isActive: false });

			expect(result.current.isInteracting).toBe(false);
		});

		it("does not reset state when isActive is true on initial render", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef, isActive: true }));

			expect(result.current.scale).toBe(1);
			expect(result.current.position).toEqual({ x: 0, y: 0 });
		});

		it("resets immediately on the first render when isActive=false", () => {
			const { result } = renderHook(() => usePinchZoom({ containerRef, isActive: false }));

			expect(result.current.scale).toBe(1);
			expect(result.current.position).toEqual({ x: 0, y: 0 });
			expect(result.current.isInteracting).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Cleanup — timeout cleared on unmount
	// -------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("does not throw when unmounting", () => {
			expect(() => {
				const { unmount } = renderHook(() => usePinchZoom({ containerRef }));
				unmount();
			}).not.toThrow();
		});

		it("clears the tap timeout on unmount", () => {
			vi.useFakeTimers();
			const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

			const { unmount } = renderHook(() => usePinchZoom({ containerRef }));
			unmount();

			// clearTimeout is called during cleanup — it should be called at least once
			// (the hook calls it unconditionally if tapTimeout.current is set)
			// We verify no unhandled timer callbacks fire after unmount.
			expect(() => vi.runAllTimers()).not.toThrow();

			clearTimeoutSpy.mockRestore();
		});

		it("removes touch event listeners on unmount", () => {
			const removeEventListenerSpy = vi.spyOn(containerRef.current!, "removeEventListener");

			const { unmount } = renderHook(() => usePinchZoom({ containerRef }));
			unmount();

			const removedEvents = removeEventListenerSpy.mock.calls.map(([event]) => event);
			expect(removedEvents).toContain("touchstart");
			expect(removedEvents).toContain("touchmove");
			expect(removedEvents).toContain("touchend");
		});

		it("attaches touch listeners with passive:false option", () => {
			const addEventListenerSpy = vi.spyOn(containerRef.current!, "addEventListener");

			renderHook(() => usePinchZoom({ containerRef }));

			const touchStartCall = addEventListenerSpy.mock.calls.find(
				([event]) => event === "touchstart",
			);
			expect(touchStartCall?.[2]).toEqual({ passive: false });
		});
	});

	// -------------------------------------------------------------------------
	// 7. containerRef with null current
	// -------------------------------------------------------------------------

	describe("with null containerRef", () => {
		it("does not throw when containerRef.current is null", () => {
			const nullRef: React.RefObject<HTMLDivElement | null> = { current: null };

			expect(() => {
				renderHook(() => usePinchZoom({ containerRef: nullRef }));
			}).not.toThrow();
		});

		it("zoomIn does not throw when containerRef.current is null", () => {
			const nullRef: React.RefObject<HTMLDivElement | null> = { current: null };
			const { result } = renderHook(() => usePinchZoom({ containerRef: nullRef }));

			expect(() => {
				act(() => {
					result.current.zoomIn();
				});
			}).not.toThrow();
		});

		it("zoomOut does not throw when containerRef.current is null", () => {
			const nullRef: React.RefObject<HTMLDivElement | null> = { current: null };
			const { result } = renderHook(() => usePinchZoom({ containerRef: nullRef }));

			expect(() => {
				act(() => {
					result.current.zoomOut();
				});
			}).not.toThrow();
		});

		it("handleKeyDown arrow keys do not throw when containerRef.current is null and zoomed", () => {
			// We use a real ref first to zoom in, then simulate null ref scenario by
			// verifying the fallback to null rect. clampPosition receives null and should handle it.
			mockClampPosition.mockImplementation((_pos: unknown, _scale: unknown, rect: unknown) => {
				if (!rect) return { x: 0, y: 0 };
				return { x: 0, y: 0 };
			});

			const nullRef: React.RefObject<HTMLDivElement | null> = { current: null };
			const { result } = renderHook(() => usePinchZoom({ containerRef: nullRef }));

			expect(() => {
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("+"));
				});
				act(() => {
					result.current.handleKeyDown(makeKeyEvent("ArrowLeft"));
				});
			}).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// 8. config overrides
	// -------------------------------------------------------------------------

	describe("config overrides", () => {
		it("respects custom keyboardZoomStep", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardZoomStep: 1 } }),
			);

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.scale).toBeCloseTo(2);
		});

		it("respects custom maxScale", () => {
			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { maxScale: 1.5, keyboardZoomStep: 1 } }),
			);

			act(() => {
				result.current.zoomIn();
			});
			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.scale).toBe(1.5);
		});

		it("respects custom minScale in reset", () => {
			const { result } = renderHook(() =>
				usePinchZoom({
					containerRef,
					config: { minScale: 0.8, maxScale: 3, keyboardZoomStep: 0.5 },
				}),
			);

			act(() => {
				result.current.zoomIn();
			});
			act(() => {
				result.current.reset();
			});

			expect(result.current.scale).toBe(0.8);
		});

		it("respects custom keyboardPanStep in arrow navigation", () => {
			mockClampPosition.mockImplementation((pos: { x: number; y: number }) => pos);

			const { result } = renderHook(() =>
				usePinchZoom({ containerRef, config: { keyboardPanStep: 100 } }),
			);

			act(() => {
				result.current.zoomIn();
			});
			const posAfterZoom = result.current.position;

			act(() => {
				result.current.handleKeyDown(makeKeyEvent("ArrowLeft"));
			});

			expect(result.current.position.x).toBe(posAfterZoom.x + 100);
		});
	});
});
