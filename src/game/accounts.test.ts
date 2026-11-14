import { describe, expect, it } from "vitest";
import { authEmail, authPassword } from "./accountKeys";

describe("account names", () => {
  it("the same name in any letter case signs into the same account", async () => {
    expect(await authEmail("Bờm  Lê")).toBe(await authEmail("bờm lê"));
  });
  it("different names are different accounts", async () => {
    expect(await authEmail("Bờm")).not.toBe(await authEmail("Bơm"));
  });
  it("a 1-character password is still accepted", () => {
    expect(authPassword("1").length).toBeGreaterThanOrEqual(6);
  });
});
