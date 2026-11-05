import type {
  TicketChannel,
  TicketPriority,
  TicketStatus,
} from "@ticketdesk/contract";

export const STATUS_LABELS: Readonly<Record<TicketStatus, string>> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  resolved: "Resolvido",
};

export const PRIORITY_LABELS: Readonly<Record<TicketPriority, string>> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const CHANNEL_LABELS: Readonly<Record<TicketChannel, string>> = {
  chat: "Chat",
  email: "E-mail",
  phone: "Telefone",
};

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
];

export const TICKET_CHANNELS: readonly TicketChannel[] = [
  "chat",
  "email",
  "phone",
];

export function formatCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString("pt-BR");
}
