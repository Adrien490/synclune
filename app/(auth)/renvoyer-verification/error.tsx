"use client";

import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ResendVerificationError({ reset }: ErrorPageProps) {
	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Link
					href="/connexion"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group min-h-11 min-w-11 -ml-2 pl-2"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">Retour à la connexion</span>
				</Link>
			</div>

			{/* Logo */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
				<Logo size={44} preload href="/" />
			</div>

			{/* Contenu */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto text-center">
					<div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
						<AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
					</div>

					<div className="space-y-3">
						<h1 className={cn("text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground", cormorantGaramond.className)}>
							Une erreur est survenue
						</h1>
						<p className="text-muted-foreground">
							Nous n'avons pas pu charger cette page. Veuillez réessayer.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<Button onClick={reset} className="w-full">
							<RefreshCw className="h-4 w-4" aria-hidden="true" />
							Réessayer
						</Button>
						<Button asChild variant="outline" className="w-full">
							<Link href="/connexion">Retour à la connexion</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
