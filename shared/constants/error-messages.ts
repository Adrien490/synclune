/**
 * Message générique affiché quand une erreur technique ne doit pas fuiter à
 * l'utilisateur. SSOT partagée entre la sanitisation du canal toast
 * (`shared/utils/toast.ts`) et le fallback d'exception de `withCallbacks`
 * (`shared/utils/with-callbacks.ts`) — ce dernier alimente aussi les surfaces
 * qui rendent `state.message` inline, hors du canal toast.
 */
export const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Merci de réessayer.";
