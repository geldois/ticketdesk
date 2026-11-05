import { ApiError } from "../api/client.ts";

const PROBLEM_TEXTS: Readonly<Record<string, string>> = {
  invalid_customer_name:
    "O nome do cliente está vazio, longo demais ou tem caracteres não permitidos.",
  invalid_description:
    "A descrição está vazia, longa demais ou tem caracteres não permitidos.",
  invalid_resolution_note:
    "A nota de resolução está vazia, longa demais ou tem caracteres não permitidos.",
  invalid_reopen_reason:
    "O motivo da reabertura está vazio, longo demais ou tem caracteres não permitidos.",
  missing_resolution_note: "A nota de resolução é obrigatória.",
  missing_reopen_reason: "O motivo da reabertura é obrigatório.",
  invalid_transition: "Esta mudança de status não é permitida.",
  ticket_not_found: "O ticket não existe mais.",
  not_ready: "O serviço ainda não está pronto. Tente de novo em instantes.",
  internal_error: "Erro inesperado no servidor.",
};

export function describeError(base: string, error: unknown): string {
  const text =
    error instanceof ApiError && error.code !== null
      ? PROBLEM_TEXTS[error.code]
      : undefined;

  return text === undefined ? base : `${base} ${text}`;
}
