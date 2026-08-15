import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderItem, ShippingAddress } from "@/modules/emails/types/email.types";
import { Hr, Link, Section, Text } from "react-email";
import { LEGAL_URLS } from "@/shared/constants/legal-urls";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";
import { FlexRow } from "./_components/flex-row";
import { formatCountryName } from "@/shared/constants/countries";

interface OrderConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	shipping: number;
	total: number;
	shippingAddress: ShippingAddress;
	/**
	 * Lien de suivi tokenisé (HMAC). Optionnel : le suivi de commande est
	 * réécrit au lot 4 de la migration lean — sans URL, le CTA est masqué.
	 */
	trackingUrl?: string | null;
}

export const OrderConfirmationEmail = ({
	orderNumber,
	customerName,
	items,
	subtotal,
	shipping,
	total,
	shippingAddress,
	trackingUrl,
}: OrderConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} confirmée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande confirmée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande est enregistrée.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Numéro de commande
				</Text>
				<Text
					style={{
						margin: "4px 0 0 0",
						fontFamily: "monospace",
						fontSize: "18px",
						fontWeight: "bold",
						color: EMAIL_COLORS.primary,
					}}
				>
					{orderNumber}
				</Text>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Articles
				</EmailHeading>

				{items.map((item, index) => (
					<FlexRow
						key={index}
						style={{
							marginBottom: "12px",
							paddingBottom: index < items.length - 1 ? "12px" : "0",
							borderBottom: index < items.length - 1 ? `1px solid ${EMAIL_COLORS.border}` : "none",
						}}
						left={
							<>
								<Text
									className={EMAIL_CLASSES.text.body}
									style={{
										margin: 0,
										fontSize: "15px",
										fontWeight: "500",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{item.name}
								</Text>
								<Text
									className={EMAIL_CLASSES.text.secondary}
									style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
								>
									{item.variantLabel
										? `${item.variantLabel} × ${item.quantity}`
										: `× ${item.quantity}`}
								</Text>
							</>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "15px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{formatEuro(item.unitPriceCents * item.quantity)}
							</Text>
						}
					/>
				))}

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "16px 0" }} />

				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Sous-total"
					value={formatEuro(subtotal)}
					variant="mono"
				/>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Livraison"
					value={formatEuro(shipping)}
					variant="mono"
				/>

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "12px 0" }} />

				<FlexRow
					left={<EmailHeading level="h3">Total</EmailHeading>}
					right={
						<Text
							style={{
								margin: 0,
								fontFamily: "monospace",
								fontSize: "18px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{formatEuro(total)}
						</Text>
					}
				/>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Livraison
				</EmailHeading>
				<EmailCard>
					{shippingAddress.name && (
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{ ...EMAIL_STYLES.text.body, margin: 0 }}
						>
							{shippingAddress.name}
						</Text>
					)}
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.line1}
						{shippingAddress.line2 && `, ${shippingAddress.line2}`}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						{shippingAddress.postalCode} {shippingAddress.city},{" "}
						{formatCountryName(shippingAddress.country)}
					</Text>
				</EmailCard>
			</Section>

			{trackingUrl && <EmailCTA href={trackingUrl}>Suivre ma commande</EmailCTA>}

			<Section style={{ marginBottom: "24px" }}>
				<Hr style={{ ...EMAIL_STYLES.hr, margin: "0 0 16px 0" }} />
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de
					14 jours à compter de la réception de votre commande pour exercer votre droit de
					rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
				</Text>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}
				>
					<Link
						href={LEGAL_URLS.CGV}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Conditions générales de vente
					</Link>
					{" · "}
					<Link
						href={LEGAL_URLS.WITHDRAWAL}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Formulaire de rétractation
					</Link>
					{" · "}
					<Link
						href={LEGAL_URLS.PRIVACY}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Politique de confidentialité
					</Link>
				</Text>
			</Section>
		</EmailLayout>
	);
};

OrderConfirmationEmail.PreviewProps = {
	orderNumber: "k3x9m2p8q1r5s7t0",
	customerName: "Marie",
	items: [
		{
			name: "Collier goutte arc-en-ciel",
			variantLabel: "Rose bonbon · Perles de verre",
			quantity: 1,
			unitPriceCents: 3800,
		},
		{
			name: "Bague Nuit étoilée",
			variantLabel: "Bleu nuit · 52 · Résine",
			quantity: 2,
			unitPriceCents: 3200,
		},
	],
	subtotal: 10200,
	shipping: 499,
	total: 10699,
	shippingAddress: {
		name: "Marie Dupont",
		line1: "12 Rue de la Paix",
		line2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "FR",
	},
	trackingUrl: null,
} as OrderConfirmationEmailProps;

export default OrderConfirmationEmail;
