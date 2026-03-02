"use client";

import { sendTestEmailAction } from "@/lib/actions/journeys/send-test-email";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface SendTestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	compositionId: number;
	channel: string;
	channelLabel?: string;
	subject?: string;
	from?: string;
}

export function SendTestDialog({
	open,
	onOpenChange,
	compositionId,
	channel,
	channelLabel,
	subject,
	from,
}: SendTestDialogProps) {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}

		setIsLoading(true);
		try {
			const result = await sendTestEmailAction(
				compositionId,
				email.trim(),
				channel,
				subject,
				from,
			);

			if (result.success) {
				toast.success("Test email sent successfully!");
				setEmail("");
				onOpenChange(false);
			} else {
				toast.error(result.errorMessage || "Failed to send test email");
			}
		} catch (error: any) {
			toast.error(error.message || "An error occurred while sending test email");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<Mail className="h-5 w-5 text-primary" />
						<DialogTitle>Send Test Email</DialogTitle>
					</div>
					<DialogDescription>
						Send a test email to verify how your composition will appear. The
						email will be sent to the address you provide.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="test-email">Email Address</Label>
							<Input
								id="test-email"
								type="email"
								placeholder="test@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isLoading}
								required
								autoFocus
							/>
						</div>
						{channelLabel && (
							<div className="rounded-lg bg-muted/50 p-3 text-sm">
								<div className="font-medium">Channel:</div>
								<div className="text-muted-foreground">{channelLabel}</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setEmail("");
								onOpenChange(false);
							}}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Mail className="mr-2 h-4 w-4" />
									Send Test
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
