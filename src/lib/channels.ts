import type { ActivityType, ChannelKey } from "@/types/database";

export const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "linkedin_connection", label: "LinkedIn Connection Request" },
  { key: "linkedin_message", label: "LinkedIn Messages" },
  { key: "linkedin_inmail", label: "LinkedIn InMail" },
  { key: "instagram_dm", label: "Instagram DM" },
  { key: "email", label: "Email" },
];

export const DEFAULT_CHANNEL: ChannelKey = "linkedin_message";

export function parseChannel(value: string | undefined | null): ChannelKey {
  return CHANNELS.find((c) => c.key === value)?.key ?? DEFAULT_CHANNEL;
}

export function channelLabel(key: ChannelKey): string {
  return CHANNELS.find((c) => c.key === key)?.label ?? key;
}

/** Activity type written when a BDR logs one of their own messages as sent. */
export function sentActivityType(channel: ChannelKey, stepKey: string, stepLabel?: string): ActivityType {
  if (stepKey === "connect" || channel === "linkedin_connection") return "connection_sent";
  if (stepLabel && /follow/i.test(stepLabel)) return "follow_up_sent";
  switch (channel) {
    case "linkedin_inmail":
      return "inmail_sent";
    case "instagram_dm":
      return "instagram_dm_sent";
    case "email":
      return "email_sent";
    default:
      return "message_sent";
  }
}

/** Activity type written when a BDR logs the prospect's reply. */
export function replyActivityType(channel: ChannelKey, stepKey: string): ActivityType {
  if (stepKey === "connect") return "connection_accepted";
  switch (channel) {
    case "linkedin_inmail":
      return "inmail_received";
    case "instagram_dm":
      return "instagram_dm_received";
    case "email":
      return "email_replied";
    default:
      return "message_received";
  }
}

export const ACTIVITY_LABELS: Partial<Record<ActivityType, string>> = {
  prospect_imported: "Prospect added",
  prospect_researched: "Researched",
  connection_sent: "Connection request sent",
  connection_accepted: "Connection accepted",
  message_sent: "LinkedIn message sent",
  message_received: "LinkedIn reply",
  inmail_sent: "InMail sent",
  inmail_received: "InMail reply",
  email_sent: "Email sent",
  email_replied: "Email reply",
  instagram_dm_sent: "Instagram DM sent",
  instagram_dm_received: "Instagram DM reply",
  follow_up_sent: "Follow-up sent",
  call_completed: "Call completed",
  meeting_scheduled: "Meeting scheduled",
  note_added: "Note",
  qualified_marked: "Lead marked",
};

export function activityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] ?? type.replaceAll("_", " ");
}

/** Maps a lifecycle stage key onto the 4-step stepper (-1 = none yet). */
export function stepperIndex(stageKey: string | undefined | null): number {
  switch (stageKey) {
    case "contacted":
    case "connection_sent":
    case "connection_accepted":
      return 0;
    case "in_conversation":
      return 1;
    case "interested_lead":
      return 2;
    case "qualified_lead":
    case "appointment_scheduled":
    case "proposal_consideration":
    case "out_for_signature":
    case "closed_won":
      return 3;
    default:
      return -1;
  }
}

export const STEPPER_LABELS = ["Contacted", "In conversation", "Interested", "Qualified"];

/** LinkedIn link carrying the prospect id so the extension knows where to send a capture. */
export function linkedinOpenUrl(url: string, prospectId: string): string {
  const base = url.split("#")[0];
  return `${base}#pw-prospect=${prospectId}`;
}
