import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/shared/constants/brand";

import type { StoreStatus } from "../types/store-settings.types";

interface StoreClosurePageProps {
	status: StoreStatus;
}

export function StoreClosurePage({ status }: StoreClosurePageProps) {
	const formattedReopensAt = status.reopensAt
		? new Intl.DateTimeFormat("fr-FR", {
				dateStyle: "long",
				timeStyle: "short",
			}).format(new Date(status.reopensAt))
		: null;

	return (
		<div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
			<div role="alert" className="mx-auto max-w-lg text-center">
				<Image
					src={BRAND.logo.url}
					alt={BRAND.logo.alt}
					width={80}
					height={80}
					className="mx-auto mb-8 rounded-full"
					priority
				/>

				<h1 className="text-foreground mb-4 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
					Boutique temporairement fermée
				</h1>

				<p className="text-muted-foreground mb-6 text-lg leading-relaxed">
					{status.closureMessage}
				</p>

				{formattedReopensAt && (
					<p className="text-muted-foreground mb-8 text-sm">
						Réouverture prévue le{" "}
						<time dateTime={new Date(status.reopensAt!).toISOString()}>{formattedReopensAt}</time>
					</p>
				)}

				<Link
					href={`mailto:${BRAND.contact.email}`}
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
				>
					<Mail className="size-4" />
					Nous contacter
				</Link>
			</div>
		</div>
	);
}
