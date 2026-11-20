import { unstable_cache } from "next/cache";
import { logApiCall } from "@/lib/api-logger";

export type TapinCity = {
  code: number;
  title: string;
};

export type TapinProvince = {
  code: number;
  title: string;
  cities: TapinCity[];
};

export type TapinLocationResponse = {
  returns: { status: number; message: string };
  entries: TapinProvince[];
};

/**
 * Sanitizes titles from Tapin by stripping \r, \n, \t, normalizing whitespace,
 * converting Arabic Yeh/Kaf to standard Persian characters, and trimming edges.
 */
export function cleanTitle(str: unknown): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u064A]/g, "ی") // Arabic Yeh to Persian Yeh
    .replace(/[\u0643]/g, "ک") // Arabic Kaf to Persian Keheh
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maps and validates a Tapin location response payload.
 */
export function transformTapinLocationResponse(data: unknown): TapinProvince[] {
  if (!data || typeof data !== "object") {
    throw new Error("Tapin API error: Empty or invalid response");
  }

  const res = data as Partial<TapinLocationResponse>;

  if (!res.returns || typeof res.returns.status !== "number") {
    throw new Error("Tapin API error: Missing status in returns");
  }

  if (res.returns.status !== 200) {
    throw new Error(
      `Tapin API error (${res.returns.status}): ${res.returns.message || "Unknown error"}`,
    );
  }

  if (!Array.isArray(res.entries)) {
    throw new Error("Tapin API error: entries is not an array");
  }

  return res.entries.map((p) => ({
    code: Number(p.code),
    title: cleanTitle(p.title),
    cities: Array.isArray(p.cities)
      ? p.cities.map((c) => ({
          code: Number(c.code),
          title: cleanTitle(c.title),
        }))
      : [],
  }));
}

/**
 * Fetch provinces and cities tree directly from Tapin public API.
 * Uses POST to https://api.tapin.ir/api/v2/public/state/tree/ with empty body JSON.stringify({}).
 * Includes Authorization header with Bearer token.
 */
export async function fetchTapinLocations(): Promise<TapinProvince[]> {
  const rawToken = process.env.TAPIN_API_TOKEN || "";
  const token = rawToken.trim();
  const authHeader = token.startsWith("Bearer ")
    ? token
    : token.startsWith("jwt ")
    ? token
    : `Bearer ${token}`;

  try {
    const res = await fetch("https://api.tapin.ir/api/v2/public/state/tree/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({}),
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`Tapin API error: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    logApiCall("tapin", "/api/v2/public/state/tree/", {}, data);
    return transformTapinLocationResponse(data);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Tapin API error:")
    ) {
      throw error;
    }
    throw new Error(
      `Failed to fetch Tapin provinces and cities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Backward compatibility alias for fetchTapinLocations
 */
export const fetchTapinProvincesAndCities = fetchTapinLocations;

/**
 * Cached version of fetchTapinLocations for Server Components.
 * Revalidates every 24 hours (86,400 seconds).
 */
export const getCachedTapinLocations = unstable_cache(
  async (): Promise<TapinProvince[]> => {
    return await fetchTapinLocations();
  },
  ["tapin-provinces-and-cities"],
  { revalidate: 86400, tags: ["tapin-locations"] },
);

/**
 * Backward compatibility alias for getCachedTapinLocations
 */
export const getCachedTapinProvincesAndCities = getCachedTapinLocations;
