import { act, renderHook } from "@testing-library/react";
import { useAppNavigation } from "./useAppNavigation";

describe("useAppNavigation", () => {
  it("opens the enabled Social tab for an authenticated user", () => {
    const { result } = renderHook(() => useAppNavigation(true));

    act(() => {
      result.current.handleTabChange("social", true);
    });

    expect(result.current.screen).toBe("social");
  });

  it("opens the inventory tab for an authenticated user", () => {
    const { result } = renderHook(() => useAppNavigation(true));

    act(() => {
      result.current.handleTabChange("inventory", true);
    });

    expect(result.current.screen).toBe("inventory");
  });
});
