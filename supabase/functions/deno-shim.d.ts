/**
 * Ambient types for Supabase Edge (Deno): `npm:` specifiers, `Deno` global, and URL imports.
 * Used by `supabase/functions/tsconfig.json` so the IDE TypeScript checker matches Deno at deploy time.
 */

declare const Deno: {
  env: { get(key: string): string | undefined };
};

declare module "npm:@google/genai@1.44.0" {
  export type GeminiRequest = Record<string, unknown>;

  export type GenerateContentResponse = {
    text?: string | (() => string);
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  export type EmbedContentResponse = {
    embeddings?: Array<{ values?: number[]; embedding?: number[] }>;
  };

  export class GoogleGenAI {
    constructor(opts: { apiKey: string });
    readonly models: {
      generateContent(req: GeminiRequest): Promise<GenerateContentResponse>;
      embedContent(req: GeminiRequest): Promise<EmbedContentResponse>;
    };
  }
}

declare module "https://esm.sh/@supabase/supabase-js@2.49.4" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type SupabaseClient = any;
}
