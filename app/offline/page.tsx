import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Hors connexion",
  description:
    "Vous semblez être hors connexion. Vérifiez votre connexion internet.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      role="alert"
      aria-live="assertive"
      className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4"
    >
      <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-6xl sm:text-8xl mb-4" aria-hidden="true">
            📡
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
            Vous êtes hors connexion
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Vérifiez votre connexion internet et réessayez. Cette page sera
            disponible dès que vous serez de nouveau connecté·e.
          </p>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/">Réessayer</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
