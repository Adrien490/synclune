import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * 📥 Téléchargement sécurisé des factures PDF
 *
 * Route proxy pour le téléchargement des factures avec :
 * - Vérification d'authentification
 * - Vérification de propriété de la facture
 * - Traçabilité des téléchargements
 * - Nom de fichier professionnel
 *
 * @param invoiceId - ID de la commande (Order.id)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    // 1. 🔐 Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
// console.error("❌ [INVOICE-DOWNLOAD] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized - Please login to download invoices" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. 📄 Récupérer la commande avec la facture
    const order = await prisma.order.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        invoiceNumber: true,
        invoiceGeneratedAt: true,
        invoiceStatus: true,
        stripeInvoiceId: true,
        total: true,
      },
    });

    if (!order) {
// console.error(`❌ [INVOICE-DOWNLOAD] Invoice not found: ${invoiceId}`);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // 3. 🔒 Vérifier que la facture appartient à l'utilisateur
    if (order.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to access this invoice" },
        { status: 403 }
      );
    }

    // 4. ✅ Vérifier que la facture est disponible
    if (!order.stripeInvoiceId) {
// console.error(`❌ [INVOICE-DOWNLOAD] No invoice ID available for order ${invoiceId}`);
      return NextResponse.json(
        { error: "Invoice not available yet" },
        { status: 404 }
      );
    }

    if (order.invoiceStatus === "PENDING") {
// console.error(`❌ [INVOICE-DOWNLOAD] Invoice not generated yet: ${invoiceId}`);
      return NextResponse.json(
        { error: "Invoice not ready for download" },
        { status: 400 }
      );
    }

    // 5. 📥 Récupérer l'URL du PDF depuis Stripe API
// console.log(`📥 [INVOICE-DOWNLOAD] Fetching invoice from Stripe: ${order.stripeInvoiceId}`);

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const invoice = await stripe.invoices.retrieve(order.stripeInvoiceId);

    if (!invoice.invoice_pdf) {
// console.error(`❌ [INVOICE-DOWNLOAD] No PDF URL in Stripe invoice`);
      return NextResponse.json(
        { error: "Invoice PDF not available" },
        { status: 404 }
      );
    }

    const pdfResponse = await fetch(invoice.invoice_pdf);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch invoice PDF" },
        { status: 500 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // 6. 📝 Générer nom de fichier professionnel
    // Format: FACTURE-2025-0001-SYNCLUNE.pdf
    const filename = order.invoiceNumber
      ? `FACTURE-${order.invoiceNumber}-SYNCLUNE.pdf`
      : `FACTURE-${order.orderNumber}-SYNCLUNE.pdf`;

// console.log(`✅ [INVOICE-DOWNLOAD] Successfully downloaded: ${filename} for user ${userId}`);

    // 7. 📤 Retourner le PDF avec headers de téléchargement
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600", // Cache 1h côté client
      },
    });
  } catch (error) {
// console.error("❌ [INVOICE-DOWNLOAD] Unexpected error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
