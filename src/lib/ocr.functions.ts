import { createServerFn } from "@tanstack/react-start";

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

interface OcrItem {
  name: string;
  price: number;
  quantity: number;
}

interface OcrResult {
  items: OcrItem[];
}

function getOpenRouterApiKey(): string | undefined {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    const key = process.env.OPENROUTER_API_KEY;
    if (typeof key === "string" && key) return key;
  }

  if (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined") {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (typeof key === "string" && key) return key;
  }

  if (typeof globalThis !== "undefined") {
    const key = (globalThis as any).OPENROUTER_API_KEY;
    if (typeof key === "string" && key) return key;
  }

  return undefined;
}

export const scanReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: { image: string }) => {
    if (!input?.image || typeof input.image !== "string") {
      throw new Error("Image data URL required");
    }
    return input;
  })
  .handler(async ({ data }): Promise<OcrResult> => {
    const apiKey = getOpenRouterApiKey();

    // Mock mode for development when API is unavailable
    if (apiKey === "mock") {
      return {
        items: [
          { name: "Coffee", price: 3.99, quantity: 1 },
          { name: "Croissant", price: 4.5, quantity: 2 },
          { name: "Orange Juice", price: 2.99, quantity: 1 },
        ],
      };
    }

    if (!apiKey)
      throw new Error(
        "OPENROUTER_API_KEY not configured. Set VITE_OPENROUTER_API_KEY in .env for local development, or configure the OPENROUTER_API_KEY secret for Cloudflare Workers."
      );

    const prompt = `You are a receipt OCR. Extract every purchasable line item from the receipt image.
Return ONLY a JSON object of shape {"items":[{"name":string,"price":number,"quantity":number}]}.
- "price" is the unit price in the receipt currency, as a number (no symbols).
- "quantity" defaults to 1 if not shown.
- IGNORE subtotals, service charges, VAT, taxes, tips, totals, change, and payment lines.
- Item names should be concise (no SKU codes) and translated to English.
If you cannot read the receipt, return {"items":[]}.`;

    // Validate the image is a data URL
    if (!data.image.startsWith("data:")) {
      throw new Error("Invalid image format. Expected data URL.");
    }

    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: data.image,
                  },
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      console.error("OpenRouter API request failed", error);
      throw new Error(
        `OpenRouter API request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`OpenRouter API error ${res.status}:`, text);
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 401 || res.status === 403)
        throw new Error(
          "Invalid OpenRouter API key. Check your VITE_OPENROUTER_API_KEY or OPENROUTER_API_KEY secret."
        );
      throw new Error(`OpenRouter API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type: string; text?: string }>;
        };
      }>;
    };
    const messageContent = json.choices?.[0]?.message?.content;
    const textContent =
      (typeof messageContent === "string"
        ? messageContent
        : messageContent?.find((part) => part.type === "output_text")?.text ??
          messageContent?.[0]?.text) ??
      "{}";
    // Strip markdown code fences if the model wrapped the JSON
    const stripped = textContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const cleanJson = (s: string) => s.replace(/,\s*([\]}])/g, "$1");
    let parsed: { items?: unknown };
    try {
      parsed = JSON.parse(cleanJson(stripped));
    } catch {
      const m = stripped.match(/\{[\s\S]*\}/);
      try {
        parsed = m ? JSON.parse(cleanJson(m[0])) : { items: [] };
      } catch {
        parsed = { items: [] };
      }
    }
    const items: OcrItem[] = Array.isArray(parsed.items)
      ? parsed.items
          .map((it) => {
            const obj = it as Record<string, unknown>;
            const name = typeof obj.name === "string" ? obj.name : "";
            const price = Number(obj.price) || 0;
            const quantity = Math.max(1, Math.round(Number(obj.quantity) || 1));
            return { name, price, quantity };
          })
          .filter((it) => it.name && it.price > 0)
      : [];
    return { items };
  });
