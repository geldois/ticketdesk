import {
  type NextTransitionResponse,
  TICKET_CHANNEL_SCHEMA,
  TICKET_PRIORITY_SCHEMA,
  TICKET_STATUS_SCHEMA,
  type TicketChannel,
  type TicketPriority,
  type TicketStatus,
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

export const TRANSITION_LABELS: Readonly<Record<TicketStatus, string>> = {
  open: "Reabrir",
  in_progress: "Iniciar atendimento",
  resolved: "Resolver",
};

export const TEXT_LABELS: Readonly<
  Record<NonNullable<NextTransitionResponse["requires"]>, string>
> = {
  resolutionNote: "Nota de resolução",
  reopenReason: "Motivo da reabertura",
};

export const CONFLICT_NOTICE = "Este ticket foi alterado por outra pessoa.";

export const TICKET_STATUSES = TICKET_STATUS_SCHEMA.options;
export const TICKET_CHANNELS = TICKET_CHANNEL_SCHEMA.options;
export const TICKET_PRIORITIES = TICKET_PRIORITY_SCHEMA.options;

export function formatInstant(instant: string): string {
  return new Date(instant).toLocaleString("pt-BR");
}
