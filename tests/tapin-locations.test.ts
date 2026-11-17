import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  transformTapinLocationResponse,
  fetchTapinProvincesAndCities,
  fetchTapinLocations,
  cleanTitle,
} from "../src/lib/providers/shipping/tapin/locations";

describe("Tapin location transformations and client", () => {
  it("correctly transforms a valid Tapin API response into TapinProvince[]", () => {
    const rawResponse = {
      returns: { status: 200, message: "عملیات با موفقیت انجام شد" },
      entries: [
        {
          code: 8,
          title: "  تهران \r\n ",
          cities: [
            { code: 801, title: "تهران\t" },
            { code: 802, title: "  شهریار  " },
          ],
        },
        {
          code: 9,
          title: "آذربايجان شرقي\t\r\n",
          cities: [
            { code: 901, title: "  تبريز  \t" },
            { code: 902, title: "مراغه" },
          ],
        },
      ],
    };

    const result = transformTapinLocationResponse(rawResponse);

    assert.equal(result.length, 2);
    assert.equal(result[0].code, 8);
    assert.equal(result[0].title, "تهران");
    assert.equal(result[0].cities.length, 2);
    assert.equal(result[0].cities[0].code, 801);
    assert.equal(result[0].cities[0].title, "تهران");
    assert.equal(result[0].cities[1].title, "شهریار");

    assert.equal(result[1].code, 9);
    // Verified that trailing tabs, newlines and Arabic Yeh are cleaned and trimmed
    assert.equal(result[1].title, "آذربایجان شرقی");
    assert.equal(result[1].cities[0].title, "تبریز");
  });

  it("cleanTitle removes whitespace, tabs, and newlines and normalizes Arabic characters", () => {
    assert.equal(cleanTitle("  آذربايجان شرقي\t\r\n"), "آذربایجان شرقی");
    assert.equal(cleanTitle("\tكاشان  "), "کاشان");
    assert.equal(cleanTitle(null), "");
    assert.equal(cleanTitle(undefined), "");
  });

  it("throws a descriptive error when Tapin status is not 200", () => {
    const errorResponse = {
      returns: { status: 401, message: "توکن نامعتبر است" },
      entries: [],
    };

    assert.throws(
      () => transformTapinLocationResponse(errorResponse),
      /Tapin API error \(401\): توکن نامعتبر است/,
    );
  });

  it("throws a descriptive error when entries is missing or not an array", () => {
    const invalidResponse = {
      returns: { status: 200, message: "OK" },
      entries: "invalid",
    };

    assert.throws(
      () => transformTapinLocationResponse(invalidResponse),
      /Tapin API error: entries is not an array/,
    );
  });

  it("throws an error for null, undefined, or empty payload", () => {
    assert.throws(
      () => transformTapinLocationResponse(null),
      /Tapin API error: Empty or invalid response/,
    );
    assert.throws(
      () => transformTapinLocationResponse({}),
      /Tapin API error: Missing status in returns/,
    );
  });

  it("fetchTapinProvincesAndCities sends POST request with correct URL, body and headers", async () => {
    const originalFetch = globalThis.fetch;
    const originalToken = process.env.TAPIN_API_TOKEN;

    try {
      process.env.TAPIN_API_TOKEN = "test-secret-token-xyz";
      let capturedUrl = "";
      let capturedOptions: RequestInit | undefined;

      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        capturedUrl = String(input);
        capturedOptions = init;
        return new Response(
          JSON.stringify({
            returns: { status: 200, message: "OK" },
            entries: [
              {
                code: 1,
                title: "البرز",
                cities: [{ code: 101, title: "کرج" }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const provinces = await fetchTapinProvincesAndCities();

      assert.equal(
        capturedUrl,
        "https://api.tapin.ir/api/v2/public/state/tree/",
      );
      assert.equal(capturedOptions?.method, "POST");
      assert.equal(capturedOptions?.body, "{}");
      const headers = capturedOptions?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer test-secret-token-xyz");
      assert.equal(headers["Content-Type"], "application/json");

      assert.equal(provinces.length, 1);
      assert.equal(provinces[0].title, "البرز");
      assert.equal(provinces[0].cities[0].title, "کرج");

      // Test alias fetchTapinLocations
      const aliasProvinces = await fetchTapinLocations();
      assert.equal(aliasProvinces.length, 1);
      assert.equal(aliasProvinces[0].title, "البرز");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.TAPIN_API_TOKEN = originalToken;
    }
  });

  it("fetchTapinProvincesAndCities throws a descriptive error on HTTP error or network failure", async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async () => {
        return new Response("Internal Server Error", {
          status: 500,
          statusText: "Server Error",
        });
      };

      await assert.rejects(
        async () => fetchTapinProvincesAndCities(),
        /Tapin API error: HTTP 500 Server Error/,
      );

      globalThis.fetch = async () => {
        throw new Error("Connection refused");
      };

      await assert.rejects(
        async () => fetchTapinProvincesAndCities(),
        /Failed to fetch Tapin provinces and cities: Connection refused/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
