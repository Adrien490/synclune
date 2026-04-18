import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
			preview={`Litige commande ${orderNumber} — Action requise`}
			headerText="Litige Stripe"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Un client a ouvert un litige (chargeback)
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Commande
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Montant contesté
						</Text>
					}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Client
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Raison
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								Deadline
							</Text>
						}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.error,
								}}
							>
								{deadline}
							</Text>
						}
					/>
				)}
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Identifiant Stripe
				</EmailHeading>
				<EmailCard>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
						Dispute ID
					</Text>
					<Text
						className={EMAIL_CLASSES.text.body}
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
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "12px", textAlign: "center" }}>
				<Button
					href={stripeDashboardUrl}
					className={EMAIL_CLASSES.button.primary}
					style={{
						...EMAIL_STYLES.button.primary,
						backgroundColor: EMAIL_COLORS.stripe,
					}}
				>
					Répondre au litige
				</Button>
			</Section>
			<EmailCTA href={dashboardUrl}>Voir la commande</EmailCTA>
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
