import { Resend } from "resend";
import { render } from "@react-email/render";
import InternalAlert from "@/components/emails/InternalAlert";
import ApplicantFormLinks, {
	type FormLink,
} from "@/components/emails/ApplicantFormLinks";

const resendApiKey = process.env.RESEND_API_KEY;
// Use the configured alert recipients or fall back to a default/empty
const alertRecipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(",") || [];
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Initialize Resend client if API key is present
if (!resendApiKey) {
	console.warn("[EmailService] RESEND_API_KEY is missing from environment.");
}
const resend = resendApiKey ? new Resend(resendApiKey) : null;

type EmailResult =
	| { success: true; messageId: string }
	| { success: false; error: string };

/**
 * Send an internal alert email to staff
 */
export async function sendInternalAlertEmail(params: {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	actionUrl?: string;
}): Promise<EmailResult> {
	if (!resend || alertRecipients.length === 0) {
		console.warn(
			"[EmailService] Resend not configured or no alert recipients. Email not sent."
		);
		return { success: false, error: "Resend not configured or no recipients" };
	}

	try {
		const emailHtml = await render(
			<InternalAlert
				title={params.title}
				message={params.message}
				workflowId={params.workflowId}
				applicantId={params.applicantId}
				type={params.type}
				details={params.details}
				actionUrl={params.actionUrl}
			/>
		);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: alertRecipients,
			subject: `[${params.type?.toUpperCase() || "INFO"}] ${params.title}`,
			html: emailHtml,
		});

		if (error) {
			console.error("[EmailService] Failed to send alert:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending alert:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send onboarding form links to an applicant
 */
export async function sendApplicantFormLinksEmail(params: {
	email: string;
	contactName?: string;
	links: FormLink[];
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Link email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	try {
		const emailHtml = await render(
			<ApplicantFormLinks contactName={params.contactName} links={params.links} />
		);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: "Action Required: Complete your StratCol Onboarding",
			html: emailHtml,
		});

		if (error) {
			console.error("[EmailService] Failed to send applicant email:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending applicant email:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send a timeout reminder email to an applicant
 * Used by Inngest workflow when forms remain incomplete
 */
export async function sendTimeoutReminderEmail(params: {
	email: string;
	contactName?: string;
	formName: string;
	daysRemaining: number;
	formUrl: string;
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Reminder email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	const urgencyLevel =
		params.daysRemaining <= 1
			? "URGENT"
			: params.daysRemaining <= 3
				? "Reminder"
				: "Friendly Reminder";

	try {
		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: `[${urgencyLevel}] Complete your ${params.formName} - ${params.daysRemaining} day(s) remaining`,
			html: `
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${params.daysRemaining <= 1 ? "#dc2626" : "#0369a1"};">
                        ${urgencyLevel}: Action Required
                    </h2>
                    <p>Hi ${params.contactName || "there"},</p>
                    <p>
                        Your <strong>${params.formName}</strong> is still pending completion. 
                        You have <strong>${params.daysRemaining} day(s)</strong> remaining to submit this form.
                    </p>
                    <p style="margin: 24px 0;">
                        <a href="${params.formUrl}" 
                           style="background: #0369a1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Complete Form Now
                        </a>
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        If you've already submitted this form, please disregard this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        StratCol Onboarding System
                    </p>
                </div>
            `,
		});

		if (error) {
			console.error("[EmailService] Failed to send reminder:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending reminder:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send a progress update email to an applicant
 * Shows completed steps and next actions
 */
export async function sendProgressUpdateEmail(params: {
	email: string;
	contactName?: string;
	completedSteps: string[];
	currentStep: string;
	nextSteps: string[];
	progressPercent: number;
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Progress email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	try {
		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: `Onboarding Progress: ${params.progressPercent}% Complete`,
			html: `
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">Your Onboarding Progress</h2>
                    <p>Hi ${params.contactName || "there"},</p>
                    
                    <!-- Progress Bar -->
                    <div style="background: #e5e7eb; border-radius: 9999px; height: 12px; margin: 20px 0;">
                        <div style="background: linear-gradient(90deg, #059669, #10b981); width: ${params.progressPercent}%; height: 100%; border-radius: 9999px;"></div>
                    </div>
                    <p style="text-align: center; color: #059669; font-weight: bold;">${params.progressPercent}% Complete</p>
                    
                    <!-- Completed Steps -->
                    ${
											params.completedSteps.length > 0
												? `
                        <h3 style="color: #374151; margin-top: 24px;">✅ Completed Steps</h3>
                        <ul style="color: #6b7280;">
                            ${params.completedSteps.map(step => `<li style="margin: 8px 0;">${step}</li>`).join("")}
                        </ul>
                    `
												: ""
										}
                    
                    <!-- Current Step -->
                    <h3 style="color: #374151; margin-top: 24px;">🔄 Current Step</h3>
                    <p style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        ${params.currentStep}
                    </p>
                    
                    <!-- Next Steps -->
                    ${
											params.nextSteps.length > 0
												? `
                        <h3 style="color: #374151; margin-top: 24px;">📋 Upcoming Steps</h3>
                        <ul style="color: #9ca3af;">
                            ${params.nextSteps.map(step => `<li style="margin: 8px 0;">${step}</li>`).join("")}
                        </ul>
                    `
												: ""
										}
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        StratCol Onboarding System
                    </p>
                </div>
            `,
		});

		if (error) {
			console.error("[EmailService] Failed to send progress email:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending progress email:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send forms progressively based on workflow stage
 * Only sends the relevant forms for the current phase
 */
export async function sendProgressiveFormsEmail(params: {
	email: string;
	contactName?: string;
	phase: "quote" | "facility_application" | "documents" | "contract";
	links: FormLink[];
	businessType?: string;
}): Promise<EmailResult> {
	if (!resend) {
		console.warn(
			"[EmailService] Resend not configured. Progressive forms email not sent."
		);
		return { success: false, error: "Resend not configured" };
	}

	const phaseConfig = {
		quote: {
			subject: "Action Required: Review and Sign Your Quote",
			heading: "Your Quote is Ready",
			description:
				"Please review and digitally sign your quote to proceed with the onboarding process.",
		},
		facility_application: {
			subject: "Action Required: Complete Your Facility Application",
			heading: "Facility Application Form",
			description:
				"Complete this application form to determine your specific compliance requirements. This will help us request only the documents relevant to your business.",
		},
		documents: {
			subject: "Action Required: Upload Required Documents",
			heading: "Document Upload Required",
			description: `Based on your ${params.businessType || "business"} profile, please upload the following documents to continue.`,
		},
		contract: {
			subject: "Final Step: Sign Your Contract & Bank Form",
			heading: "Almost Done!",
			description:
				"Review and sign your contract, then complete the bank form to finalize your onboarding.",
		},
	};

	const config = phaseConfig[params.phase];

	try {
		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: config.subject,
			html: `
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0369a1;">${config.heading}</h2>
                    <p>Hi ${params.contactName || "there"},</p>
                    <p>${config.description}</p>
                    
                    <div style="margin: 24px 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 16px 0; color: #334155;">Required Actions:</h3>
                        ${params.links
													.map(
														link => `
                            <div style="margin: 12px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <a href="${link.url}" style="color: #0369a1; text-decoration: none; font-weight: 500;">
                                    ${link.label}
                                </a>
                                ${link.description ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">${link.description}</p>` : ""}
                            </div>
                        `
													)
													.join("")}
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        If you have any questions, please reply to this email or contact your account manager.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        StratCol Onboarding System
                    </p>
                </div>
            `,
		});

		if (error) {
			console.error("[EmailService] Failed to send progressive forms email:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending progressive forms email:", error);
		return { success: false, error: String(error) };
	}
}
