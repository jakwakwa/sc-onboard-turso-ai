/**
 * Kill Switch API Endpoint
 *
 * Dedicated endpoint for executing the kill switch to immediately
 * terminate a workflow when procurement is denied.
 *
 * POST /api/risk-decision/kill
 * Body: { workflowId, applicantId, reason }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";

// ============================================
// Request Schema
// ============================================

const KillSwitchSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	reason: z.string().min(1, "Reason is required"),
});

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		// Authenticate the request - only authorized users can trigger kill switch
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}

		// Parse and validate request body
		const body = await request.json();
		const validationResult = KillSwitchSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, reason } = validationResult.data;

		console.log(`[KillSwitchAPI] Executing kill switch for workflow ${workflowId}:`, {
			killedBy: userId,
			reason,
		});

		// Execute the kill switch
		const result = await executeKillSwitch({
			workflowId,
			applicantId,
			killedBy: userId,
			reason,
		});

		if (!result.success) {
			return NextResponse.json(
				{
					error: "Failed to execute kill switch",
					message: result.error,
				},
				{ status: 500 }
			);
		}

		// Return success response
		return NextResponse.json({
			success: true,
			message: "Workflow terminated successfully",
			...result,
		});
	} catch (error) {
		console.error("[KillSwitchAPI] Error executing kill switch:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
