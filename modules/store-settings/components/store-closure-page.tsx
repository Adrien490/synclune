import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";

import type { StoreStatus } from "../types/store-settings.types";

interface StoreClosurePageProps {
	status: StoreStatus;
}

export function StoreClosurePage({ status }: StoreClosurePageProps) {
	const reopensAtDate = status.reopensAt ? new Date(status.reopensAt) : null;

	const formattedReopensAt = reopensAtDate
		? new Intl.DateTimeFormat("fr-FR", {
				dateStyle: "long",
				timeStyle: "short",
			}).format(reopensAtDate)
		: null;

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br px-4">
			{/* CSS-only decorative blobs */}
			<div aria-hidden="true">
				<div className="bg-primary/10 absolute top-[10%] left-[15%] size-32 rounded-full blur-2xl motion-safe:animate-[drift_20s_ease-in-out_infinite]" />
				<div className="bg-secondary/15 absolute top-[60%] right-[10%] size-24 rounded-full blur-3xl motion-safe:animate-[drift_25s_ease-in-out_infinite_reverse]" />
				<div className="bg-primary/8 absolute bottom-[15%] left-[40%] size-20 rotate-45 blur-xl motion-safe:animate-[drift_18s_ease-in-out_2s_infinite]" />
				<div className="bg-secondary/10 absolute top-[30%] right-[30%] size-16 rounded-full blur-2xl motion-safe:animate-[drift_22s_ease-in-out_4s_infinite_reverse]" />
			</div>

			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center" aria-live="polite">
				<div className="space-y-4">
					<p className="mb-4 text-8xl" aria-hidden="true">
						🔒
					</p>

					<Image
						src={BRAND.logo.url}
						alt={BRAND.logo.alt}
						width={96}
						height={96}
						className="mx-auto rounded-full"
						priority
					/>

					<h1 className="font-display text-foreground text-3xl font-semibold md:text-4xl">
						Boutique temporairement fermée
					</h1>

					<p className="text-muted-foreground text-lg md:text-xl">{status.closureMessage}</p>
				</div>

				{formattedReopensAt && reopensAtDate && (
					<p className="text-muted-foreground text-sm">
						Réouverture prévue le{" "}
						<time dateTime={reopensAtDate.toISOString()}>{formattedReopensAt}</time>
					</p>
				)}

				<div className="flex justify-center">
					<Button asChild variant="secondary" size="lg">
						<Link href={`mailto:${BRAND.contact.email}`}>
							<Mail className="size-4" />
							Nous contacter
						</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
