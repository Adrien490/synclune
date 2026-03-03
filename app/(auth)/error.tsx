"use client";

import { AuthErrorBoundary } from "@/modules/auth/components/auth-error-boundary";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function AuthError({ reset }: ErrorPageProps) {
	return <AuthErrorBoundary reset={reset} showCreateAccountLink />;
}
