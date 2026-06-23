import { describe, expect, test } from "vitest";

import { resolveAuthUser } from "./queries";

describe("resolveAuthUser", () => {
  test("normalizes undefined user results to null", async () => {
    const result = await resolveAuthUser(async () => undefined, new AbortController().signal);

    expect(result).toBeNull();
  });
});
