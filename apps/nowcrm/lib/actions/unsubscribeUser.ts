"use server";

import { getContactByEmail } from "@/lib/actions/contacts/getContactByEmail";
import { logUnsubscribeEvent } from "@/lib/actions/events/log-event";
import subscriptionsService from "@/lib/services/new_type/subscriptions.service";

export async function unsubscribeUser(
	email: string,
	channelName: string = "Email",
	compositionId?: number,
): Promise<{ message: string; success: boolean }> {
	console.log("[unsubscribeUser] Invoked with:", {
		email,
		channelName,
		compositionId,
	});

	const contact = await getContactByEmail(email);
	console.log(
		"[unsubscribeUser] Contact lookup result:",
		contact ? `FOUND id=${contact.id}` : "NOT FOUND",
	);

	if (!contact) {
		return {
			message: "You are not currently subscribed.",
			success: true,
		};
	}

	const activeSubscriptions = contact.subscriptions?.filter(
		(sub) => sub?.active === true,
	);
	console.log(
		"[unsubscribeUser] Active subscriptions:",
		activeSubscriptions?.map((s) => ({
			id: s.id,
			channel: s.channel?.name,
			active: s.active,
		})) ?? "NONE",
	);

	if (!activeSubscriptions || activeSubscriptions.length === 0) {
		console.log("[unsubscribeUser] No active subscriptions found.");
		return {
			message: "You are not currently subscribed.",
			success: true,
		};
	}

	// --- Unsubscribe from ALL channels ---
	if (channelName === "All") {
		let successCount = 0;
		let failureCount = 0;

		for (const sub of activeSubscriptions) {
			try {
				console.log(
					`[unsubscribeUser] Updating subscription id=${sub.id}, channel=${sub.channel?.name}`,
				);
				await subscriptionsService.update(sub.id, { active: false }, true);
				console.log(
					`[unsubscribeUser] Subscription ${sub.id} updated to inactive.`,
				);

				console.log(
					`[unsubscribeUser] Logging unsubscribe event for channel=${sub.channel?.id}`,
				);
				const logResult = await logUnsubscribeEvent(
					contact,
					compositionId || 0,
					sub.channel.id,
					{ reason: "user clicked unsubscribe link" },
				);
				console.log("[unsubscribeUser] logUnsubscribeEvent result:", logResult);

				successCount++;
			} catch (err) {
				console.error(
					`[unsubscribeUser] Failed to unsubscribe from ${sub?.channel?.name}:`,
					err,
				);
				failureCount++;
			}
		}

		console.log(
			`[unsubscribeUser] Completed bulk unsubscribe. successCount=${successCount}, failureCount=${failureCount}`,
		);

		if (successCount > 0) {
			return {
				message: `You have been unsubscribed from all channels successfully.`,
				success: true,
			};
		} else {
			return {
				message: "Unsubscribe failed. No subscriptions were updated.",
				success: false,
			};
		}
	}

	// --- Unsubscribe from a single channel ---
	const subscription = activeSubscriptions.find(
		(sub) => sub?.channel?.name === channelName,
	);
	console.log(
		"[unsubscribeUser] Target subscription:",
		subscription
			? { id: subscription.id, channel: subscription.channel?.name }
			: "NOT FOUND",
	);

	if (!subscription) {
		return {
			message: `You are not currently subscribed to ${channelName}.`,
			success: true,
		};
	}

	try {
		console.log(
			`[unsubscribeUser] Updating subscription id=${subscription.id}, channel=${channelName}`,
		);
		const updated = await subscriptionsService.update(
			subscription.id,
			{ active: false },
			true,
		);
		console.log("[unsubscribeUser] Update result:", updated);

		if (updated?.success ?? true) {
			console.log("[unsubscribeUser] Logging unsubscribe event...");
			const logResult = await logUnsubscribeEvent(
				contact,
				compositionId || 0,
				subscription.channel.id,
				{ reason: "user clicked unsubscribe link" },
			);
			console.log("[unsubscribeUser] logUnsubscribeEvent result:", logResult);

			return {
				message: `You have been unsubscribed from ${channelName} successfully.`,
				success: true,
			};
		} else {
			console.warn("[unsubscribeUser] Update failed:", updated);
			return {
				message: updated?.errorMessage || "Unsubscribe update failed.",
				success: false,
			};
		}
	} catch (err) {
		console.error("[unsubscribeUser] Exception during unsubscribe:", err);
		return {
			message: "There was a problem unsubscribing. Please try again.",
			success: false,
		};
	}
}
