import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface AdminDisputeAlertEmailProps {
	orderNumber: string;
	customerEmail: string;
	amount: number;
	reason: string;
	disputeId: string;
	deadline: string | null;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}

export const AdminDisputeAlertEmail = ({
	orderNumber,
	customerEmail,
	amount,
	reason,
	disputeId,
	deadline,
	dashboardUrl,
	stripeDashboardUrl,
}: AdminDisputeAlertEmailProps) => {
	return (
		<EmailLayout
			preview={`LITIGE : Commande ${orderNumber} — Action requise`}
			headerText="Litige Stripe"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={{ ...EMAIL_STYLES.text.small }}>
					Un client a ouvert un litige (chargeback)
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
						left={<Text style={EMAIL_STYLES.text.small}>Montant contesté</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{formatEuro(amount)}
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
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Raison</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{reason}
							</Text>
						}
					/>
					{deadline && (
						<FlexRow
							left={<Text style={EMAIL_STYLES.text.small}>Deadline</Text>}
							right={
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "bold",
										color: "#dc2626",
									}}
								>
									{deadline}
								</Text>
							}
						/>
					)}
				</Section>
			</Section>

			{/* Stripe IDs */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Identifiant Stripe
				</Text>
				<Section style={EMAIL_STYLES.section.card}>
					<Text style={EMAIL_STYLES.text.tiny}>Dispute ID</Text>
					<Text
						style={{
							margin: 0,
							marginTop: "4px",
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{disputeId}
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
						Répondre au litige
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

AdminDisputeAlertEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerEmail: "marie.dupont@example.com",
	amount: 18390,
	reason: "Produit non reçu",
	disputeId: "dp_1234567890abcdefghij",
	deadline: "15/03/2026",
	dashboardUrl: "https://synclune.fr/admin/commandes/clxxx12345",
	stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_1234567890abcdefghij",
} as AdminDisputeAlertEmailProps;

export default AdminDisputeAlertEmail;
