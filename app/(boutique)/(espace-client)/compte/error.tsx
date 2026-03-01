"use client";

import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { User, RefreshCw } from "lucide-react";
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";

export default function AccountError({ reset }: ErrorPageProps) {
	return (
		<>
			<PageHeader title="Mon compte" description="Une erreur est survenue" variant="compact" />

			<Empty className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<User className="text-muted-foreground size-6" />
					</EmptyMedia>
					<EmptyTitle>Impossible de charger votre compte</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-muted-foreground mb-6 max-w-md">
						Une erreur est survenue lors du chargement de votre compte. Réessayez dans quelques
						instants.
					</p>
					<div className="flex flex-col gap-3 sm:flex-row">
						<Button onClick={reset} variant="primary" size="lg">
							<RefreshCw className="mr-2 size-4" />
							Réessayer
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href={ROUTES.ACCOUNT.ROOT}>Tableau de bord</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		</>
	);
}
