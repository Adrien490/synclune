"use client";

import type { ReactNode } from "react";

function PassThrough({ children }: { children: ReactNode }) {
	return children;
}

export const SerwistProvider =
	process.env.NODE_ENV === "production"
		? require("@serwist/turbopack/react").SerwistProvider
		: PassThrough;
