import { beforeEach, describe, expect, it } from "vitest";
import { currentAccount, login } from "./accounts";

describe("accounts", () => {
  beforeEach(() => localStorage.clear());
  it("a new name creates the account and signs in", async () => {
    expect(await login("Bờm", "123")).toEqual({ ok: true, name: "Bờm", created: true });
    expect(currentAccount()?.name).toBe("Bờm");
  });
  it("the same name with the right password signs in", async () => {
    await login("Bờm", "123");
    expect((await login("Bờm", "123")).ok).toBe(true);
  });
  it("the same name with a wrong password is refused", async () => {
    await login("Bờm", "123");
    expect(await login("Bờm", "sai")).toEqual({ ok: false, error: "Sai mật khẩu" });
  });
});
