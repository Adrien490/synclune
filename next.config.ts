import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ====================================================================
   * EXTERNAL PACKAGES
   * ====================================================================
   * Packages to be treated as external (not bundled)
   * Required for Prisma 7 compatibility with Turbopack
   */
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  /**
   * ====================================================================
   * MDX SUPPORT
   * ====================================================================
   * Configure Next.js pour supporter les fichiers .md et .mdx
   */
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  /**
   * ====================================================================
   * CACHE COMPONENTS - Next.js 16
   * ====================================================================
   *
   * Active le système de cache de Next.js 16 pour améliorer les performances.
   *
   * 3 types de cache disponibles :
   * - "use cache" : Pour les données publiques partagées (produits, collections)
   * - "use cache: private" : Pour les données utilisateur (panier, wishlist)
   * - "use cache: remote" : Pour les données du dashboard (après await connection())
   *
   * Configuration centralisée dans /lib/cache/ :
   * - tags.ts : Tous les tags d'invalidation
   * - utils.ts : Helpers de configuration (cacheProducts, cacheColors, etc.)
   * - invalidations.ts : Helpers pour invalidation cross-domain
   */
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "x1ain1wpub.ufs.sh",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [32, 48, 64, 96, 128, 256, 384], // Removed 16 (Next.js 16 default)
    minimumCacheTTL: 14400, // Changed from 60 to 14400 (4 hours - Next.js 16 default)
    qualities: [75, 80, 85, 90, 95], // Support multiple quality levels for responsive images
  },
  experimental: {
    useCache: true,
    viewTransition: true,
  },

  /**
   * ====================================================================
   * CACHE LIFE - Profils de durée de cache
   * ====================================================================
   *
   * Définit les durées de cache pour différents types de données.
   *
   * Paramètres :
   * - stale : Durée en secondes avant que les données soient considérées comme "périmées"
   * - revalidate : Fréquence de revalidation en arrière-plan (en secondes)
   * - expire : Durée totale avant expiration du cache (en secondes)
   *
   * Stratégie adaptée pour une petite boutique de bijoux artisanaux :
   * - Cache court sur produits (15min) pour afficher rapidement les nouveautés
   * - Cache long sur référentiels (couleurs, types) car ils changent rarement
   * - Cache très court sur dashboard (1min) pour des données à jour
   */
  cacheLife: {
    /**
     * PRODUITS PUBLICS
     * Cache court pour afficher rapidement les nouveautés et le stock mis à jour
     * Utilisé par : fetchProducts, listes de produits, recherche
     */
    products: {
      stale: 900,      // 15 minutes - données "fraîches"
      revalidate: 300, // 5 minutes - revalidation en arrière-plan
      expire: 21600,   // 6 heures - expiration totale
    },

    /**
     * COLLECTIONS
     * Cache moyen car les collections changent moins souvent que les produits
     * Utilisé par : fetchCollections, pages de collections
     */
    collections: {
      stale: 3600,     // 1 heure
      revalidate: 900, // 15 minutes
      expire: 86400,   // 1 jour
    },

    /**
     * DONNÉES RÉFÉRENTIELLES (couleurs, types de bijoux)
     * Cache très long car ces données changent très rarement
     * Utilisé par : fetchColors, fetchProductTypes, filtres
     *
     * Optimisation : Cache de 7 jours pour réduire la charge serveur
     * (les couleurs et types de bijoux changent très rarement)
     */
    reference: {
      stale: 604800,   // 7 jours (au lieu de 24h)
      revalidate: 86400,// 1 jour (au lieu de 2h)
      expire: 2592000, // 30 jours
    },

    /**
     * DÉTAIL PRODUIT
     * Cache aligné avec la liste des produits pour cohérence
     * Utilisé par : fetchProduct, pages /creations/[slug]
     */
    productDetail: {
      stale: 900,      // 15 minutes (aligné avec products)
      revalidate: 300, // 5 minutes
      expire: 21600,   // 6 heures
    },

    /**
     * DASHBOARD ADMIN
     * Cache très court pour des données toujours à jour
     * Utilisé par : KPIs, graphiques, listes admin
     */
    dashboard: {
      stale: 60,       // 1 minute - données "fraîches"
      revalidate: 30,  // 30 secondes - revalidation très fréquente
      expire: 300,     // 5 minutes - expiration rapide
    },

    /**
     * CHANGELOGS
     * Cache long car les changelogs changent très rarement
     * Utilisé par : ChangelogDialog, système de notifications
     */
    changelog: {
      stale: 86400,    // 1 jour - les changelogs sont stables
      revalidate: 3600, // 1 heure - vérification périodique
      expire: 604800,  // 7 jours - expiration longue
    },
  },
};

/**
 * ====================================================================
 * MDX CONFIGURATION
 * ====================================================================
 * Wrapper la configuration Next.js avec le support MDX
 * Supporte .md et .mdx pour le contenu (changelog, blog, etc.)
 */
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  // Ajouter des plugins remark/rehype ici si besoin
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
