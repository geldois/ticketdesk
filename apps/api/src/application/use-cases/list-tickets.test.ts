import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedTestDatabase,
  queryRows,
} from "../../../test/database.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { PgUoW } from "../../infrastructure/pg-uow.ts";
import { ApplicationError, InvalidLimitError } from "../errors.ts";
import type { ListTicketsQuery } from "../stored-ticket.ts";
import { ListTicketsUseCase, type TicketPage } from "./list-tickets.ts";

describe("ListTicketsUseCase", () => {
  let databaseUrl: string;
  let pgPool: Pool;
  let listTicketsUseCase: ListTicketsUseCase;
  let counter = 0;

  // Semeia `count` tickets de created_at crescente e devolve os ids do mais novo ao mais antigo, a ordem da lista.
  async function seed(
    count: number,
    channelOf: (index: number) => string = () => "chat",
  ): Promise<string[]> {
    await queryRows(databaseUrl, "DELETE FROM ticket");
    const ids: string[] = [];

    for (let index = 0; index < count; index++) {
      counter += 1;
      const id = `019a0000-0000-7000-8000-${counter.toString(16).padStart(12, "0")}`;
      const createdAt = `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00.000000Z`;

      await queryRows(
        databaseUrl,
        "INSERT INTO ticket (id, customer_name, description, channel, priority, status, created_at) VALUES ($1, 'Seed', 'x', $2, 'low', 'open', $3)",
        [id, channelOf(index), createdAt],
      );
      ids.push(id);
    }

    return ids.reverse();
  }

  function list(query: Partial<ListTicketsQuery>): Promise<TicketPage> {
    return listTicketsUseCase.execute({
      status: null,
      channel: null,
      afterPosition: null,
      limit: 20,
      ...query,
    });
  }

  function idsOf(page: TicketPage): string[] {
    return page.listedTickets.map((listedTicket) => listedTicket.ref.id);
  }

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    listTicketsUseCase = new ListTicketsUseCase(() => PgUoW.begin(pgPool));
  });

  afterAll(async () => {
    await pgPool.end();
  });

  it("returns the page of tickets and the position that starts the next page when more tickets follow", async () => {
    const order = await seed(5);

    const page = await list({ limit: 2 });

    expect(idsOf(page)).toEqual(order.slice(0, 2));
    expect(page.afterPosition).toEqual(page.listedTickets[1]?.position);
  });

  it("starts the next page right after the last ticket of the page before", async () => {
    const order = await seed(5);
    const first = await list({ limit: 2 });

    const second = await list({ limit: 2, afterPosition: first.afterPosition });

    expect(idsOf(second)).toEqual(order.slice(2, 4));
    expect(second.afterPosition).not.toBeNull();
  });

  it("returns the last page with the rest of the tickets and no position", async () => {
    const order = await seed(5);
    const first = await list({ limit: 2 });
    const second = await list({ limit: 2, afterPosition: first.afterPosition });

    const third = await list({ limit: 2, afterPosition: second.afterPosition });

    expect(idsOf(third)).toEqual(order.slice(4));
    expect(third.afterPosition).toBeNull();
  });

  it("has no position on a page that holds exactly the page size when no ticket follows", async () => {
    const order = await seed(4);
    const first = await list({ limit: 2 });

    const second = await list({ limit: 2, afterPosition: first.afterPosition });

    expect(idsOf(second)).toEqual(order.slice(2));
    expect(second.afterPosition).toBeNull();
  });

  it("returns every ticket and no position when they all fit in one page", async () => {
    const order = await seed(3);

    const page = await list({ limit: 20 });

    expect(idsOf(page)).toEqual(order);
    expect(page.afterPosition).toBeNull();
  });

  it("returns an empty page and no position when there are no tickets", async () => {
    await seed(0);

    const page = await list({ limit: 2 });

    expect(page.listedTickets).toEqual([]);
    expect(page.afterPosition).toBeNull();
  });

  it("never returns more tickets than the page size", async () => {
    await seed(10);

    const page = await list({ limit: 3 });

    expect(page.listedTickets).toHaveLength(3);
  });

  it("lists each ticket once when the pages follow each other through the position", async () => {
    const order = await seed(7);
    const walked: string[] = [];
    let page = await list({ limit: 3 });
    walked.push(...idsOf(page));

    while (page.afterPosition !== null) {
      page = await list({ limit: 3, afterPosition: page.afterPosition });
      walked.push(...idsOf(page));
    }

    expect(walked).toEqual(order);
  });

  it("applies the filters to the page and to the position that follows it", async () => {
    await seed(6, (index) => (index % 2 === 0 ? "email" : "chat"));

    const page = await list({ limit: 2, channel: "email" });

    expect(page.listedTickets).toHaveLength(2);
    expect(
      page.listedTickets.every(
        (listedTicket) => listedTicket.ticket.channel === "email",
      ),
    ).toBe(true);
    expect(page.afterPosition).not.toBeNull();
  });

  it.each([1, 100])("accepts the limit %i", async (limit) => {
    await seed(1);

    const page = await list({ limit });

    expect(page.listedTickets).toHaveLength(1);
  });

  it.each([0, 101, -1, 1.5, Number.NaN])(
    "throws InvalidLimitError with the code invalid_limit for the limit %s",
    async (limit) => {
      const failure = await list({ limit })
        .then(() => undefined)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(InvalidLimitError);
      expect(failure).toBeInstanceOf(ApplicationError);
      expect(failure).toMatchObject({ code: "invalid_limit" });
    },
  );
});
