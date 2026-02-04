"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";

interface UseNotificationsOptions {
	/** Polling interval in milliseconds (default: 10000ms = 10 seconds) */
	pollingInterval?: number;
	/** Initial notifications from server */
	initialNotifications?: WorkflowNotification[];
	/** Enable/disable polling */
	enabled?: boolean;
}

interface UseNotificationsReturn {
	notifications: WorkflowNotification[];
	isLoading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	deleteNotification: (id: string) => Promise<void>;
	unreadCount: number;
}

/**
 * Real-time notifications hook with polling
 * Automatically fetches notifications every N seconds
 */
export function useNotifications({
	pollingInterval = 10000,
	initialNotifications = [],
	enabled = true,
}: UseNotificationsOptions = {}): UseNotificationsReturn {
	const [notifications, setNotifications] =
		useState<WorkflowNotification[]>(initialNotifications);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const fetchNotifications = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch("/api/notifications", {
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch notifications: ${response.status}`);
			}

			const data = await response.json();
			setNotifications(data.notifications || []);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Unknown error"));
			console.error("[useNotifications] Fetch error:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initial fetch + polling
	useEffect(() => {
		if (!enabled) return;

		// Fetch immediately
		fetchNotifications();

		// Set up polling interval
		const intervalId = setInterval(fetchNotifications, pollingInterval);

		return () => clearInterval(intervalId);
	}, [enabled, pollingInterval, fetchNotifications]);

	// Update from initial props when they change
	useEffect(() => {
		if (initialNotifications.length > 0) {
			setNotifications(initialNotifications);
		}
	}, [initialNotifications]);

	const markAsRead = useCallback(async (id: string) => {
		try {
			await fetch(`/api/notifications/${id}`, { method: "PATCH" });
			setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
		} catch (err) {
			console.error("[useNotifications] Mark as read failed:", err);
		}
	}, []);

	const markAllAsRead = useCallback(async () => {
		try {
			await fetch("/api/notifications/mark-all-read", { method: "POST" });
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
		} catch (err) {
			console.error("[useNotifications] Mark all read failed:", err);
		}
	}, []);

	const deleteNotification = useCallback(async (id: string) => {
		try {
			await fetch(`/api/notifications/${id}`, { method: "DELETE" });
			setNotifications(prev => prev.filter(n => n.id !== id));
		} catch (err) {
			console.error("[useNotifications] Delete failed:", err);
		}
	}, []);

	const unreadCount = notifications.filter(n => !n.read).length;

	return {
		notifications,
		isLoading,
		error,
		refetch: fetchNotifications,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		unreadCount,
	};
}
