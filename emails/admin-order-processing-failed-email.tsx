import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminOrderProcessingFailedEmailProps {
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
	paymentIntentId: string;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}

export const AdminOrderProcessingFailedEmail = ({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
	paymentIntentId,
	dashboardUrl,
	stripeDashboardUrl,
}: AdminOrderProcessingFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`[URGENT] Paiement recu — Echec traitement commande ${orderNumber}`}
			headerText="Echec traitement commande"
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					Le paiement a ete encaisse mais la commande n&apos;a pas pu etre traitee. Une intervention
					manuelle est requise.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text
					style={{
						...EMAIL_STYLES.text.small,
						color: EMAIL_COLORS.error,
						fontWeight: "bold",
					}}
				>
					Le client a paye mais sa commande n&apos;a pas pu etre traitee. Action manuelle requise
					immediatement.
				</Text>
			</Section>

			{/* Details */}
			<Section style={{ marginBottom: "24px" }}>
				<Section style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Commande</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{orderNumber}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Client</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{customerEmail}
							</Text>
						}
					/>
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Montant encaisse</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{formatEuro(total)}
							</Text>
						}
					/>
				</Section>
			</Section>

			{/* Error details */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>Erreur</Text>
				<ErrorCodeBlock error={errorMessage} />
			</Section>

			{/* Stripe IDs */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>Identifiants Stripe</Text>
				<Section style={EMAIL_STYLES.section.card}>
					<Text style={EMAIL_STYLES.text.tiny}>Payment Intent ID</Text>
					<Text
						style={{
							margin: 0,
							marginTop: "4px",
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{paymentIntentId}
					</Text>
				</Section>
			</Section>

			{/* CTAs */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<div style={{ marginBottom: "12px" }}>
					<Button
						href={stripeDashboardUrl}
						style={{
							...EMAIL_STYLES.button.primary,
							backgroundColor: EMAIL_COLORS.stripe,
						}}
					>
						Ouvrir Stripe
					</Button>
				</div>
				<div>
					<Button href={dashboardUrl} style={EMAIL_STYLES.button.primary}>
						Voir la commande
					</Button>
				</div>
			</Section>
		</EmailLayout>
	);
};

AdminOrderProcessingFailedEmail.PreviewProps = {
	orderNumber: "SYN-20260310-X1Y2",
	customerEmail: "client@example.com",
	total: 12500,
	errorMessage: "Error: SKU sku_abc123 not found or inactive — cannot process order",
	paymentIntentId: "pi_3abc123def456ghi",
	dashboardUrl: "https://synclune.fr/admin/orders/clxxx12345",
	stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_3abc123def456ghi",
} as AdminOrderProcessingFailedEmailProps;

export default AdminOrderProcessingFailedEmail;
