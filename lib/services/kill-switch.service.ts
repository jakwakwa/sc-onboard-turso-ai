/**
 * Kill Switch Service
 *
 * Provides immediate workflow termination functionality for procurement denial.
 * This is a CRITICAL safety feature that halts all parallel processes when
 * a Risk Manager denies procurement clearance.
 *
 * Key responsibilities:
 * 1. Send kill event to Inngest to terminate workflow
 * 2. Update workflow status to 'terminated'
 * 3. Invalidate all pending form magic links
 * 4. Send termination notifications to relevant parties
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicantMagiclinkForms, applicants } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { sendInternalAlertEmail } from "@/lib/services/email.service";

export interface KillSwitchParams {
	workflowId: number;
	applicantId: number;
	killedBy: string;
	reason: string;
}

export interface KillSwitchResult {
	success: boolean;
	workflowId: number;
	terminatedAt: string;
	invalidatedForms: number;
	error?: string;
}

/**
 * Execute the kill switch - immediately terminates a workflow
 * This is triggered when Risk Manager denies procurement clearance
 *
 * @param params - Kill switch parameters
 * @returns Result of the kill switch operation
 */
export async function executeKillSwitch(
	params: KillSwitchParams
): Promise<KillSwitchResult> {
	const { workflowId, applicantId, killedBy, reason } = params;
	const timestamp = new Date().toISOString();

	console.log(
		`[KillSwitch] Executing kill switch for Workflow ${workflowId}. Reason: ${reason}`
	);

	const db = getDatabaseClient();
	if (!db) {
		return {
			success: false,
			workflowId,
			terminatedAt: timestamp,
			invalidatedForms: 0,
			error: "Database connection failed",
		};
	}

	try {
		// Step 1: Send kill event to Inngest (triggers workflow termination)
		await inngest.send({
			name: "risk/procurement.kill",
			data: {
				workflowId,
				applicantId,
				killedBy,
				reason,
				timestamp,
			},
		});

		// Step 2: Update workflow status to terminated
		await db
			.update(workflows)
			.set({
				status: "terminated",
			})
			.where(eq(workflows.id, workflowId));

		// Step 3: Invalidate all pending magic link forms
		const invalidatedResult = await db
			.update(applicantMagiclinkForms)
			.set({
				status: "revoked",
			})
			.where(eq(applicantMagiclinkForms.workflowId, workflowId));

		// Count invalidated forms (SQLite doesn't return affected rows easily)
		const pendingForms = await db
			.select()
			.from(applicantMagiclinkForms)
			.where(eq(applicantMagiclinkForms.workflowId, workflowId));
		const invalidatedCount = pendingForms.length;

		// Step 4: Log the kill switch event
		await logWorkflowEvent({
			workflowId,
			eventType: "kill_switch_executed",
			payload: {
				killedBy,
				reason,
				invalidatedForms: invalidatedCount,
			},
		});

		// Step 5: Create notification for dashboard
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "failed",
			title: "Workflow Terminated - Procurement Denied",
			message: `Application terminated by ${killedBy}. Reason: ${reason}`,
			actionable: false,
		});

		// Step 6: Send internal alert email
		const applicantResults = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		const applicant = applicantResults[0];

		await sendInternalAlertEmail({
			title: "🚨 Kill Switch Activated - Workflow Terminated",
			message: `Workflow ${workflowId} for ${applicant?.companyName || "Unknown"} has been terminated.\n\nReason: ${reason}\nTerminated by: ${killedBy}`,
			workflowId,
			applicantId,
			type: "error",
		});

		console.log(
			`[KillSwitch] Successfully terminated Workflow ${workflowId}. Invalidated ${invalidatedCount} forms.`
		);

		return {
			success: true,
			workflowId,
			terminatedAt: timestamp,
			invalidatedForms: invalidatedCount,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error during kill switch";
		console.error(`[KillSwitch] Error executing kill switch: ${errorMessage}`);

		return {
			success: false,
			workflowId,
			terminatedAt: timestamp,
			invalidatedForms: 0,
			error: errorMessage,
		};
	}
}

/**
 * Check if a workflow has been terminated
 *
 * @param workflowId - The workflow ID to check
 * @returns True if the workflow is terminated
 */
export async function isWorkflowTerminated(workflowId: number): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) return false;

	const result = await db
		.select({ status: workflows.status })
		.from(workflows)
		.where(eq(workflows.id, workflowId));

	return result[0]?.status === "terminated";
}
