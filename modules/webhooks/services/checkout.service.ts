// Facade for the payment-intent order-processing flow (Stripe Elements).
//
// Le flow réel est exclusivement PaymentIntents (cf. initialize-payment.ts) : aucune
// Checkout Session n'est créée, donc les helpers CS historiques (extractShippingInfo,
// cancelExpiredOrder, processOrderTransaction, buildPostCheckoutTasks) ont été retirés.

// Re-export order processing function (public API preserved)
export { processOrderFromPaymentIntent } from "./checkout-order-processing.service";

// Re-export post-checkout task builder (public API preserved)
export { buildPostCheckoutTasksFromPI } from "./checkout-post-tasks.service";
