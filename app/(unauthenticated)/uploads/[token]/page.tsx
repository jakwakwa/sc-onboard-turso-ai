import { eq } from "drizzle-orm";
import FormShell from "@/components/forms/form-shell";
import UploadView from "./upload-view";
import {
	getDocumentRequirements,
	type DocumentRequirementContext,
} from "@/config/document-requirements";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";

interface UploadPageProps {
	params: Promise<{ token: string }>;
}

export default async function UploadPage({ params }: UploadPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance || formInstance.formType !== "DOCUMENT_UPLOADS") {
		return (
			<FormShell
				title="Upload link invalid"
				description="The upload link is invalid or no longer available.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a new upload link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<FormShell title="Upload link expired" description="This link has expired.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a fresh link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	// Look up the applicant to build conditional requirements context
	const db = getDatabaseClient();
	let context: DocumentRequirementContext = {};

	if (db) {
		const applicantResults = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, formInstance.applicantId));

		const applicant = applicantResults[0];

		if (applicant) {
			context = {
				entityType: (applicant.entityType as DocumentRequirementContext["entityType"]) ?? undefined,
				industry: applicant.industry ?? undefined,
				productType: (applicant.productType as DocumentRequirementContext["productType"]) ?? undefined,
				isHighRisk: applicant.riskLevel === "red",
			};
		}
	}

	const requirements = getDocumentRequirements(context);

	return (
		<FormShell
			title="Document Uploads"
			description="Upload the documents required for your StratCol onboarding. Only documents relevant to your application are shown below.">
			<UploadView token={token} requirements={requirements} />
		</FormShell>
	);
}
