import { act, renderHook, waitFor } from "@testing-library/react";
import { useMarkets } from "@/hooks/useMarkets";
import type { MarketFilters } from "@/lib/api";
import { MARKET, apiError, mockFetchMarkets, pending } from "./mockApiClient";

jest.mock("@/lib/api");

// Held stable across renders: useMarkets keys its effect on filter identity, so
// an inline object literal would retrigger the fetch on every render
const FILTERS: MarketFilters = { status: "Open", weightClass: "Heavyweight" };

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe("useMarkets", () => {
  describe("loading state", () => {
    it("starts loading with an empty list before the request settles", () => {
      mockFetchMarkets.mockReturnValue(pending());

      const { result } = renderHook(() => useMarkets());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.markets).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("returns to loading while a refetch is in flight", async () => {
      mockFetchMarkets.mockResolvedValueOnce([MARKET]);
      const { result } = renderHook(() => useMarkets());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockFetchMarkets.mockReturnValue(pending());
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));
    });
  });

  describe("success state", () => {
    it("exposes the fetched markets and clears loading", async () => {
      mockFetchMarkets.mockResolvedValue([MARKET]);

      const { result } = renderHook(() => useMarkets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.markets).toEqual([MARKET]);
      expect(result.current.error).toBeNull();
    });

    it("passes filters through to the API client", async () => {
      mockFetchMarkets.mockResolvedValue([MARKET]);

      const { result } = renderHook(() => useMarkets(FILTERS));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetchMarkets).toHaveBeenCalledWith(FILTERS);
    });

    it("refetches on demand", async () => {
      mockFetchMarkets.mockResolvedValue([MARKET]);
      const { result } = renderHook(() => useMarkets());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.refetch();
      });

      expect(mockFetchMarkets).toHaveBeenCalledTimes(2);
      expect(result.current.markets).toEqual([MARKET]);
    });

    it("polls every 30 seconds", async () => {
      jest.useFakeTimers();
      mockFetchMarkets.mockResolvedValue([MARKET]);
      renderHook(() => useMarkets());

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockFetchMarkets).toHaveBeenCalledTimes(2);
    });
  });

  describe("error state", () => {
    it("surfaces an API failure as an Error and keeps the list empty", async () => {
      mockFetchMarkets.mockRejectedValue(apiError(500, "Internal Server Error"));

      const { result } = renderHook(() => useMarkets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("500");
      expect(result.current.markets).toEqual([]);
    });

    it("wraps a non-Error rejection", async () => {
      mockFetchMarkets.mockRejectedValue("network down");

      const { result } = renderHook(() => useMarkets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toEqual(new Error("Unknown error"));
    });

    it("clears a previous error once a retry succeeds", async () => {
      mockFetchMarkets.mockRejectedValueOnce(apiError(500, "Internal Server Error"));
      const { result } = renderHook(() => useMarkets());
      await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

      mockFetchMarkets.mockResolvedValueOnce([MARKET]);
      await act(async () => {
        result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.markets).toEqual([MARKET]);
    });
  });

  it("stops polling after unmount", async () => {
    jest.useFakeTimers();
    mockFetchMarkets.mockResolvedValue([MARKET]);
    const { unmount } = renderHook(() => useMarkets());

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(90000);
    });

    expect(mockFetchMarkets).toHaveBeenCalledTimes(1);
  });
});
