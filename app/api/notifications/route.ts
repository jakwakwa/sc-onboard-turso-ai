import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { notifications, applicants } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Returns all notifications for the current user's dashboard
 */
export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Fetch recent notifications with applicant info
		const results = await db
			.select({
				id: notifications.id,
				workflowId: notifications.workflowId,
				applicantId: notifications.applicantId,
				type: notifications.type,
				message: notifications.message,
				read: notifications.read,
				actionable: notifications.actionable,
				createdAt: notifications.createdAt,
				clientName: applicants.companyName,
			})
			.from(notifications)
			.leftJoin(applicants, eq(notifications.applicantId, applicants.id))
			.orderBy(desc(notifications.createdAt))
			.limit(50);

		// Transform to match WorkflowNotification interface
		const notificationsList = results.map(row => ({
			id: String(row.id),
			workflowId: row.workflowId ?? 0,
			applicantId: row.applicantId ?? 0,
			clientName: row.clientName || "Unknown Client",
			type: row.type as
				| "awaiting"
				| "completed"
				| "failed"
				| "timeout"
				| "paused"
				| "error"
				| "warning"
				| "info"
				| "success",
			message: row.message,
			timestamp: row.createdAt ? new Date(row.createdAt) : new Date(),
			read: row.read ?? false,
			actionable: row.actionable ?? false,
		}));

		return NextResponse.json({ notifications: notificationsList });
	} catch (error) {
		console.error("[GET /api/notifications] Error:", error);
		return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
	}
}
