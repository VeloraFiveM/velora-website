import { describe, it, expect } from "vitest";
import { can } from "./index";
describe("permissions", () => {
  it("denies anonymous and suspended accounts", () => {
    expect(can(null, "roles.manage", "123")).toBe(false);
    expect(
      can(
        { discordId: "123", suspended: true, permissions: [] },
        "roles.manage",
        "123",
      ),
    ).toBe(false);
  });
  it("grants the configured owner only", () => {
    expect(
      can(
        { discordId: "123", suspended: false, permissions: [] },
        "roles.manage",
        "123",
      ),
    ).toBe(true);
    expect(
      can(
        { discordId: "456", suspended: false, permissions: [] },
        "roles.manage",
        "123",
      ),
    ).toBe(false);
  });
  it("requires a configured owner or explicit permission", () => {
    expect(
      can(
        { discordId: "", suspended: false, permissions: [] },
        "roles.manage",
        "",
      ),
    ).toBe(false);
    expect(
      can(
        { discordId: "456", suspended: false, permissions: ["tickets.reply"] },
        "tickets.reply",
        "123",
      ),
    ).toBe(true);
    expect(
      can(
        { discordId: "456", suspended: false, permissions: ["tickets.reply"] },
        "roles.manage",
        "123",
      ),
    ).toBe(false);
  });
});
