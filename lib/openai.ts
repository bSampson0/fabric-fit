import OpenAI from "openai";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Proxy defers client creation to first API call, so a missing env var
// is caught inside the route handler's try/catch instead of at module
// load time (which causes a 502 on Netlify rather than a clean 500).
const openai = new Proxy({} as OpenAI, {
  get(_, prop: string | symbol) {
    const val = (client() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(client())
      : val;
  },
});

export default openai;
