import { beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase, queryRows } from "../../test/database.ts";
import { InvalidCustomerNameError } from "../domain/errors.ts";
import {
  CUSTOMER_NAME,
  DESCRIPTION,
  REOPEN_REASON,
  RESOLUTION_NOTE,
  TRANSITION_TICKET_STATUSES,
} from "../domain/invariants.ts";
import {
  createTicketChange,
  transitTicketChange,
} from "../domain/lifecycle.ts";
import {
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketStatus,
} from "../domain/ticket.ts";

const INSTANT = new Date("2026-01-01T00:00:00.000Z");
const ASTRAL_LETTER = "\u{1D49C}";

function checkViolation(constraint: string | RegExp): {
  code: string;
  constraint: unknown;
} {
  return {
    code: "23514",
    constraint:
      typeof constraint === "string"
        ? constraint
        : expect.stringMatching(constraint),
  };
}

function notNullViolation(column: string): { code: string; column: string } {
  return { code: "23502", column };
}

const TICKET_HISTORY_ENTRY_TICKET_ID_FKEY = {
  code: "23503",
  constraint: "ticket_history_entry_ticket_id_fkey",
};

const VALID_TICKET_INPUT = {
  customerName: "Ana",
  description: "Printer is down",
  channel: "chat",
  priority: "low",
};

interface TicketValues {
  customerName: string;
  description: string;
  channel: string;
  priority: string;
  status: string;
  resolutionNote: string | null;
}

interface TicketHistoryEntryValues {
  from: string | null;
  to: string | null;
  resolutionNote: string | null;
  reopenReason: string | null;
  at: Date | null;
}

type StatusPair = readonly [TicketStatus | null, TicketStatus];

const VALID_TICKET: TicketValues = {
  ...VALID_TICKET_INPUT,
  status: "open",
  resolutionNote: null,
};

function firstString(rows: Record<string, unknown>[], column: string): string {
  const value = rows[0]?.[column];

  if (typeof value !== "string") {
    throw new Error(`expected a string in ${column}`);
  }

  return value;
}

async function insertTicket(
  databaseUrl: string,
  values: Partial<TicketValues> = {},
): Promise<string> {
  const ticket = { ...VALID_TICKET, ...values };
  const rows = await queryRows(
    databaseUrl,
    `INSERT INTO ticket (customer_name, description, channel, priority, status, resolution_note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      ticket.customerName,
      ticket.description,
      ticket.channel,
      ticket.priority,
      ticket.status,
      ticket.resolutionNote,
      INSTANT,
    ],
  );

  return firstString(rows, "id");
}

async function insertTicketHistoryEntry(
  databaseUrl: string,
  values: Partial<TicketHistoryEntryValues> = {},
  ticketId?: string,
): Promise<string> {
  const entry: TicketHistoryEntryValues = {
    from: null,
    to: "open",
    resolutionNote: null,
    reopenReason: null,
    at: INSTANT,
    ...values,
  };
  const referencedTicketId = ticketId ?? (await insertTicket(databaseUrl));

  await queryRows(
    databaseUrl,
    `INSERT INTO ticket_history_entry (ticket_id, from_status, to_status, resolution_note, reopen_reason, at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      referencedTicketId,
      entry.from,
      entry.to,
      entry.resolutionNote,
      entry.reopenReason,
      entry.at,
    ],
  );

  return referencedTicketId;
}

function ticketIn(status: TicketStatus): Ticket {
  return {
    ...VALID_TICKET_INPUT,
    channel: "chat",
    priority: "low",
    status,
    resolutionNote: status === "resolved" ? "done" : null,
    createdAt: INSTANT,
  };
}

function domainAccepts(
  from: TicketStatus | null,
  to: TicketStatus,
  resolutionNote: string | null,
  reopenReason: string | null,
): boolean {
  if (from === null) {
    return resolutionNote === null && reopenReason === null;
  }

  try {
    transitTicketChange(
      ticketIn(from),
      { to, resolutionNote, reopenReason },
      INSTANT,
    );

    return true;
  } catch {
    return false;
  }
}

const CREATION_TICKET_HISTORY_ENTRY = createTicketChange(
  VALID_TICKET_INPUT,
  INSTANT,
).ticketHistoryEntry;

const ACCEPTED_PAIRS: readonly StatusPair[] = [
  [CREATION_TICKET_HISTORY_ENTRY.from, CREATION_TICKET_HISTORY_ENTRY.to],
  ...TICKET_STATUSES.flatMap((from) =>
    [...TRANSITION_TICKET_STATUSES[from]].map((to): StatusPair => [from, to]),
  ),
];

const ALL_PAIRS: readonly StatusPair[] = [null, ...TICKET_STATUSES].flatMap(
  (from) => TICKET_STATUSES.map((to): StatusPair => [from, to]),
);

function isAccepted(pair: StatusPair): boolean {
  return ACCEPTED_PAIRS.some(
    ([from, to]) => from === pair[0] && to === pair[1],
  );
}

const REFUSED_PAIRS = ALL_PAIRS.filter((pair) => !isAccepted(pair));

type Presence = readonly [
  TicketStatus | null,
  TicketStatus,
  string | null,
  string | null,
];

const PRESENCES: readonly Presence[] = ACCEPTED_PAIRS.flatMap(([from, to]) =>
  [null, "done"].flatMap((resolutionNote) =>
    [null, "again"].map((reopenReason): Presence => [
      from,
      to,
      resolutionNote,
      reopenReason,
    ]),
  ),
);

const ACCEPTED_PRESENCES = PRESENCES.filter((presence) =>
  domainAccepts(...presence),
);
const REFUSED_PRESENCES = PRESENCES.filter(
  (presence) => !domainAccepts(...presence),
);

function textThatFits(pair: StatusPair): {
  resolutionNote: string | null;
  reopenReason: string | null;
} {
  return {
    resolutionNote: pair[1] === "resolved" ? "done" : null,
    reopenReason: pair[1] === "open" && pair[0] !== null ? "again" : null,
  };
}

describe("the tables", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
  });

  it("are exactly ticket and ticket_history_entry", async () => {
    const rows = await queryRows(
      databaseUrl,
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'pgmigrations' ORDER BY table_name`,
    );

    expect(rows.map((row) => row["table_name"])).toEqual([
      "ticket",
      "ticket_history_entry",
    ]);
  });

  it.each([
    [
      "ticket",
      [
        ["channel", "text", "NO"],
        ["created_at", "timestamp with time zone", "NO"],
        ["customer_name", "text", "NO"],
        ["description", "text", "NO"],
        ["id", "uuid", "NO"],
        ["priority", "text", "NO"],
        ["resolution_note", "text", "YES"],
        ["status", "text", "NO"],
        ["version", "integer", "NO"],
      ],
    ],
    [
      "ticket_history_entry",
      [
        ["at", "timestamp with time zone", "NO"],
        ["from_status", "text", "YES"],
        ["id", "bigint", "NO"],
        ["reopen_reason", "text", "YES"],
        ["resolution_note", "text", "YES"],
        ["ticket_id", "uuid", "NO"],
        ["to_status", "text", "NO"],
      ],
    ],
  ])(
    "%s has exactly the columns, types and nullability of the contract",
    async (table, columns) => {
      const rows = await queryRows(
        databaseUrl,
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name`,
        [table],
      );

      expect(
        rows.map((row) => [
          row["column_name"],
          row["data_type"],
          row["is_nullable"],
        ]),
      ).toEqual(columns);
    },
  );
});

describe("ticket", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
  });

  it.each([
    [
      "channel",
      TICKET_CHANNELS,
      ["fax", "urgent", "", "EMAIL"],
      "ticket_channel_set_check",
    ],
    [
      "priority",
      TICKET_PRIORITIES,
      ["urgent", "", "LOW"],
      "ticket_priority_set_check",
    ],
  ] as const)(
    "accepts each %s of the set and refuses a value outside it",
    async (field, accepted, refused, constraint) => {
      for (const value of accepted) {
        await expect(
          insertTicket(databaseUrl, { [field]: value }),
        ).resolves.toBeTypeOf("string");
      }

      for (const value of refused) {
        await expect(
          insertTicket(databaseUrl, { [field]: value }),
        ).rejects.toMatchObject(checkViolation(constraint));
      }
    },
  );

  it("accepts each status of the set and refuses a value outside it", async () => {
    await expect(
      insertTicket(databaseUrl, { status: "open" }),
    ).resolves.toBeTypeOf("string");
    await expect(
      insertTicket(databaseUrl, { status: "in_progress" }),
    ).resolves.toBeTypeOf("string");
    await expect(
      insertTicket(databaseUrl, { status: "resolved", resolutionNote: "done" }),
    ).resolves.toBeTypeOf("string");

    for (const status of ["closed", "", "OPEN"]) {
      await expect(insertTicket(databaseUrl, { status })).rejects.toMatchObject(
        checkViolation("ticket_status_set_check"),
      );
    }
  });

  it("holds a resolution note if, and only if, the status is resolved", async () => {
    await expect(
      insertTicket(databaseUrl, { status: "resolved", resolutionNote: "done" }),
    ).resolves.toBeTypeOf("string");
    await expect(
      insertTicket(databaseUrl, { status: "resolved", resolutionNote: null }),
    ).rejects.toMatchObject(
      checkViolation("ticket_resolution_note_presence_check"),
    );
    await expect(
      insertTicket(databaseUrl, { status: "open", resolutionNote: "done" }),
    ).rejects.toMatchObject(
      checkViolation("ticket_resolution_note_presence_check"),
    );
    await expect(
      insertTicket(databaseUrl, {
        status: "in_progress",
        resolutionNote: "done",
      }),
    ).rejects.toMatchObject(
      checkViolation("ticket_resolution_note_presence_check"),
    );
  });

  it("generates a UUID v7 id and starts at version 1", async () => {
    const id = await insertTicket(databaseUrl);
    const rows = await queryRows(
      databaseUrl,
      "SELECT version FROM ticket WHERE id = $1",
      [id],
    );

    expect(id[14]).toBe("7");
    expect(rows[0]?.["version"]).toBe(1);
  });

  it.each([0, -1])("refuses version %i", async (version) => {
    await expect(
      queryRows(
        databaseUrl,
        `INSERT INTO ticket (customer_name, description, channel, priority, status, version, created_at)
         VALUES ('Ana', 'x', 'chat', 'low', 'open', $1, now())`,
        [version],
      ),
    ).rejects.toMatchObject(checkViolation("ticket_version_min_check"));
  });

  it("refuses a row without the creation instant", async () => {
    await expect(
      queryRows(
        databaseUrl,
        `INSERT INTO ticket (customer_name, description, channel, priority, status)
         VALUES ('Ana', 'x', 'chat', 'low', 'open')`,
      ),
    ).rejects.toMatchObject(notNullViolation("created_at"));
  });

  it.each(["Ana $ Lima", "Ana \u{1F600}"])(
    "accepts the customer name %s that the domain refuses, because the character format belongs to the domain",
    async (customerName) => {
      await expect(
        insertTicket(databaseUrl, { customerName }),
      ).resolves.toBeTypeOf("string");
      expect(() =>
        createTicketChange({ ...VALID_TICKET_INPUT, customerName }, INSTANT),
      ).toThrow(InvalidCustomerNameError);
    },
  );
});

describe.each([
  {
    field: "ticket customer_name",
    maxLength: CUSTOMER_NAME.maxLength,
    constraint: "ticket_customer_name_length_check",
    insert: (databaseUrl: string, value: string) =>
      insertTicket(databaseUrl, { customerName: value }),
  },
  {
    field: "ticket description",
    maxLength: DESCRIPTION.maxLength,
    constraint: "ticket_description_length_check",
    insert: (databaseUrl: string, value: string) =>
      insertTicket(databaseUrl, { description: value }),
  },
  {
    field: "ticket resolution_note",
    maxLength: RESOLUTION_NOTE.maxLength,
    constraint: "ticket_resolution_note_length_check",
    insert: (databaseUrl: string, value: string) =>
      insertTicket(databaseUrl, { status: "resolved", resolutionNote: value }),
  },
  {
    field: "ticket_history_entry resolution_note",
    maxLength: RESOLUTION_NOTE.maxLength,
    constraint: "ticket_history_entry_resolution_note_length_check",
    insert: (databaseUrl: string, value: string) =>
      insertTicketHistoryEntry(databaseUrl, {
        from: "in_progress",
        to: "resolved",
        resolutionNote: value,
      }),
  },
  {
    field: "ticket_history_entry reopen_reason",
    maxLength: REOPEN_REASON.maxLength,
    constraint: "ticket_history_entry_reopen_reason_length_check",
    insert: (databaseUrl: string, value: string) =>
      insertTicketHistoryEntry(databaseUrl, {
        from: "resolved",
        to: "open",
        reopenReason: value,
      }),
  },
])("the size of $field", ({ maxLength, constraint, insert }) => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
  });

  it("accepts one code point and the maximum of the domain", async () => {
    await expect(insert(databaseUrl, "a")).resolves.toBeTypeOf("string");
    await expect(
      insert(databaseUrl, "a".repeat(maxLength)),
    ).resolves.toBeTypeOf("string");
  });

  it("counts a letter outside the basic plane as one code point", async () => {
    await expect(
      insert(databaseUrl, ASTRAL_LETTER.repeat(maxLength)),
    ).resolves.toBeTypeOf("string");
    await expect(
      insert(databaseUrl, ASTRAL_LETTER.repeat(maxLength + 1)),
    ).rejects.toMatchObject(checkViolation(constraint));
  });

  it("refuses an empty text and one code point above the maximum", async () => {
    await expect(insert(databaseUrl, "")).rejects.toMatchObject(
      checkViolation(constraint),
    );
    await expect(
      insert(databaseUrl, "a".repeat(maxLength + 1)),
    ).rejects.toMatchObject(checkViolation(constraint));
  });
});

describe("ticket_history_entry", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
  });

  it.each(ACCEPTED_PAIRS)(
    "accepts the pair %s to %s, which the domain produces",
    async (from, to) => {
      await expect(
        insertTicketHistoryEntry(databaseUrl, {
          from,
          to,
          ...textThatFits([from, to]),
        }),
      ).resolves.toBeTypeOf("string");
    },
  );

  it.each(REFUSED_PAIRS)(
    "refuses the pair %s to %s, which the domain never produces",
    async (from, to) => {
      await expect(
        insertTicketHistoryEntry(databaseUrl, {
          from,
          to,
          ...textThatFits([from, to]),
        }),
      ).rejects.toMatchObject(
        checkViolation("ticket_history_entry_status_pair_check"),
      );
    },
  );

  it.each(ACCEPTED_PRESENCES)(
    "accepts %s to %s with note %s and reason %s, as the domain does",
    async (from, to, resolutionNote, reopenReason) => {
      await expect(
        insertTicketHistoryEntry(databaseUrl, {
          from,
          to,
          resolutionNote,
          reopenReason,
        }),
      ).resolves.toBeTypeOf("string");
    },
  );

  it.each(REFUSED_PRESENCES)(
    "refuses %s to %s with note %s and reason %s, as the domain does",
    async (from, to, resolutionNote, reopenReason) => {
      await expect(
        insertTicketHistoryEntry(databaseUrl, {
          from,
          to,
          resolutionNote,
          reopenReason,
        }),
      ).rejects.toMatchObject(checkViolation(/_presence_check$/));
    },
  );

  it("refuses statuses that the contract does not know", async () => {
    await expect(
      insertTicketHistoryEntry(databaseUrl, { from: "x", to: "y" }),
    ).rejects.toMatchObject(checkViolation(/_status_set_check$/));
  });

  it("refuses an entry without destination or instant", async () => {
    await expect(
      insertTicketHistoryEntry(databaseUrl, { to: null }),
    ).rejects.toMatchObject(notNullViolation("to_status"));
    await expect(
      insertTicketHistoryEntry(databaseUrl, { at: null }),
    ).rejects.toMatchObject(notNullViolation("at"));
  });

  it("refuses an entry for a ticket that does not exist", async () => {
    await expect(
      insertTicketHistoryEntry(
        databaseUrl,
        {},
        "019a0000-0000-7000-8000-000000000000",
      ),
    ).rejects.toMatchObject(TICKET_HISTORY_ENTRY_TICKET_ID_FKEY);
  });

  it("refuses to delete a ticket that has history, with no cascade", async () => {
    const ticketId = await insertTicketHistoryEntry(databaseUrl);

    await expect(
      queryRows(databaseUrl, "DELETE FROM ticket WHERE id = $1", [ticketId]),
    ).rejects.toMatchObject(TICKET_HISTORY_ENTRY_TICKET_ID_FKEY);
  });
});
