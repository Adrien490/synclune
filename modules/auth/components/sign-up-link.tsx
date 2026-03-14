import Link from "next/link";

export function SignUpLink({ callbackURL }: { callbackURL?: string }) {
	const href = callbackURL
		? `/inscription?callbackURL=${encodeURIComponent(callbackURL)}`
		: "/inscription";

	return (
		<div className="text-muted-foreground text-sm">
			Première visite ?{" "}
			<Link href={href} className="font-medium underline">
				Créez votre compte
			</Link>
		</div>
	);
}
