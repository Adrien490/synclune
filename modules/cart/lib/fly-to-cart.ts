/**
 * Fly-to-cart animation event system.
 *
 * Dispatches a custom event with the source element position.
 * The FlyToCartOverlay component listens for this event and
 * animates a dot from the source to the cart icon in the navbar.
 */

export const CART_TARGET_ATTR = "data-cart-target";
export const FLY_TO_CART_EVENT = "fly-to-cart";

export interface FlyToCartDetail {
	fromX: number;
	fromY: number;
}

/**
 * Dispatch a fly-to-cart animation from the given element's position.
 */
export function dispatchFlyToCart(element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	window.dispatchEvent(
		new CustomEvent<FlyToCartDetail>(FLY_TO_CART_EVENT, {
			detail: {
				fromX: rect.left + rect.width / 2,
				fromY: rect.top + rect.height / 2,
			},
		}),
	);
}
