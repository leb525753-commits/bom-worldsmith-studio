import { describe, expect, it } from "vitest";
import { freeReply } from "./aiFree";

describe("free Bờm AI replies", () => {
  it("typing 20/11 gets a built-in answer", () => {
    expect(freeReply("20/11")).toContain("20/11");
    expect(freeReply(" 20 / 11 ")).not.toBeNull();
  });
  it("other messages still go to the AI", () => {
    expect(freeReply("xây nhà")).toBeNull();
    expect(freeReply("20/11 là ngày gì")).toBeNull();
  });
});
