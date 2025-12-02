/**
 * Module Auth - Point d'entrée
 *
 * Exports publics pour l'authentification et la gestion des sessions
 */

// Actions
export { changePassword } from "./actions/change-password";
export { logout } from "./actions/logout";
export { requestPasswordReset } from "./actions/request-password-reset";
export { resendVerificationEmail } from "./actions/resend-verification-email";
export { resetPassword } from "./actions/reset-password";
export { signInEmail } from "./actions/sign-in-email";
export { signInSocial } from "./actions/sign-in-social";
export { signUpEmail } from "./actions/sign-up-email";

// Hooks
export { useChangePassword } from "./hooks/use-change-password";
export { useLogout } from "./hooks/use-logout";
export { useRequestPasswordReset } from "./hooks/use-request-password-reset";
export { useResendVerificationEmail } from "./hooks/use-resend-verification-email";
export { useResetPassword } from "./hooks/use-reset-password";
export { useSignInEmail } from "./hooks/use-sign-in-email";
export { useSignInSocial } from "./hooks/use-sign-in-social";
export { useSignUpEmail } from "./hooks/use-sign-up-email";

// Utils
export { isAdmin, isAuthenticated } from "./utils/guards";
export { checkArcjetProtection } from "./utils/arcjet-protection";

// Lib
export { getSession } from "./lib/get-current-session";
export { auth } from "./lib/auth";
export type { Session, User } from "./lib/auth";

// Schemas
export {
	callbackURLSchema,
	changePasswordSchema,
	newPasswordSchema,
	requestPasswordResetSchema,
	resendVerificationEmailSchema,
	resetPasswordSchema,
	signInEmailSchema,
	signInSocialSchema,
	signUpEmailSchema,
} from "./schemas/auth.schemas";

// Types
export type {
	ChangePasswordInput,
	RequestPasswordResetInput,
	ResendVerificationEmailInput,
	ResetPasswordInput,
	SignInEmailInput,
	SignInSocialInput,
	SignUpEmailInput,
} from "./schemas/auth.schemas";
