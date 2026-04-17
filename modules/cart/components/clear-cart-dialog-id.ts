/**
 * Dialog ID constant for the clear-cart confirmation.
 * Extracted to a pure module so it can be imported from `CartClearButton`
 * without pulling in the dialog + action chain (which requires Stripe init).
 */
export const CLEAR_CART_DIALOG_ID = "clear-cart";
