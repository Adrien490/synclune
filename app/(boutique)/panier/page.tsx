import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { CartItemsList } from "@/modules/cart/components/cart-items-list";
import { CartItemsListSkeleton } from "@/modules/cart/components/cart-items-list-skeleton";
import { CartSummary } from "@/modules/cart/components/cart-summary";
import { getCart } from "@/modules/cart/data/get-cart";
import { RemoveCartItemAlertDialog } from "@/modules/cart/components/remove-cart-item-alert-dialog";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mon panier - Synclune | Bijoux artisanaux faits main",
	description:
		"Ton panier de bijoux artisanaux faits main. Finalise ta commande et reçois tes créations uniques chez toi.",
	alternates: {
		canonical: "/panier",
	},
	robots: {
		index: false,
		follow: false,
	},
};

export default async function CartPage() {
  const cartPromise = getCart();
  const cart = await cartPromise;

  // Panier vide
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen relative">
        {/* Background minimal - Ne pas distraire de l'action */}
        <ParticleSystem variant="minimal" className="fixed inset-0 z-0" />

        <PageHeader
          title="Mon panier"
          breadcrumbs={[{ label: "Panier", href: "/panier" }]}
        />

        <section className="bg-background py-8 relative z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Empty className="my-12 border-0 bg-linear-card rounded-2xl shadow-sm">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="text-primary/70">
                  {/* Icône cœur doux avec pétales */}
                  <svg
                    aria-hidden="true"
                    className="size-16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Cœur principal */}
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    {/* Petites étoiles décoratives avec animation sparkle */}
                    <path
                      d="M17 2l.5 1.5L19 4l-1.5.5L17 6l-.5-1.5L15 4l1.5-.5z"
                      fill="currentColor"
                      opacity="0.6"
                      className="animate-sparkle-pulse"
                      style={{ animationDelay: "0s" }}
                    />
                    <path
                      d="M6 3l.3 1L7 4.3 6.7 5 6 5.3 5.7 5 5 4.7l.3-.7z"
                      fill="currentColor"
                      opacity="0.5"
                      className="animate-sparkle-pulse"
                      style={{ animationDelay: "1s" }}
                    />
                    <path
                      d="M4 10l.3 1L5 11.3 4.7 12 4 12.3 3.7 12 3 11.7l.3-.7z"
                      fill="currentColor"
                      opacity="0.4"
                      className="animate-sparkle-pulse"
                      style={{ animationDelay: "2s" }}
                    />
                  </svg>
                </EmptyMedia>
                <EmptyTitle className="text-foreground/90">
                  Ton panier est vide !
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Tu peux aller jeter un œil à mes créations pour trouver ton
                  bonheur 💕
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="primary" size="lg" className="shadow-sm">
                  <Link href="/produits">Découvrir la collection</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background minimal - Focus sur le panier et conversion */}
      <ParticleSystem variant="minimal" className="fixed inset-0 z-0" />

      <PageHeader
        title="Mon panier"
        breadcrumbs={[{ label: "Panier", href: "/panier" }]}
      />

      <section className="bg-background py-6 sm:py-8 group relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Grille principale avec group pour détecter data-pending */}
          <div className="group grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Récapitulatif (affiché en premier sur mobile) */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <CartSummary cart={cart} />
            </div>

            {/* Liste des articles (affiché en second sur mobile) */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <Suspense fallback={<CartItemsListSkeleton />}>
                <CartItemsList cartPromise={cartPromise} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Dialog de confirmation pour suppression */}
      <RemoveCartItemAlertDialog />
    </div>
  );
}
