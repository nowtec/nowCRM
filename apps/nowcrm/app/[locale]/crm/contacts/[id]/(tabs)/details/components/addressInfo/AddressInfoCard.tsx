"use client";

import { MapPin } from "lucide-react";
import { useMessages } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Contact } from "@nowcrm/services";
import { EditDialogAddress } from "./editDialog";

interface AddressCardProps {
	contact: Contact;
}

export function AddressCard({ contact }: AddressCardProps) {
	const t = useMessages();
	const [isEditing, setIsEditing] = useState(false);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{t.Contacts.details.address.title}</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(true)}
						>
							{t.common.actions.edit}
						</Button>
					</CardTitle>
					<CardDescription>
						{t.Contacts.details.address.description}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start space-x-3">
						<MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
						<div>
							{contact.address_line1 && <p>{contact.address_line1}</p>}
							{contact.address_line2 && <p>{contact.address_line2}</p>}
							<p>
								{contact.location && `${contact.location}, `}
								{contact.canton && `${contact.canton}, `}
								{contact.zip && `${contact.zip}, `}
								{contact.country}
							</p>
						</div>
					</div>

					{!contact.address_line1 && !contact.location && !contact.country && (
						<p className="text-muted-foreground italic">
							{t.Contacts.details.address.noAddress}
						</p>
					)}
				</CardContent>
			</Card>

			<EditDialogAddress
				contact={contact}
				isOpen={isEditing}
				onClose={() => setIsEditing(false)}
			/>
		</>
	);
}
