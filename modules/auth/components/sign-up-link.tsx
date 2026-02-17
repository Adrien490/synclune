"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function SignUpLink() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL");
	const href = callbackURL
		? `/inscription?callbackURL=${encodeURIComponent(callbackURL)}`
		: "/inscription";

	return (
		<div className="text-sm text-muted-foreground">
			Première visite ?{" "}
			<Link href={href} className="font-medium underline">
				Créez votre compte
			</Link>
		</div>
	);
}
