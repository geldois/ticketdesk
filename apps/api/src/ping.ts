import { ping } from "@ticketdesk/contract";

export function handlePing(): string {
  return ping();
}
