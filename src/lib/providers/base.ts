// ===========================================================================
// RankRentDeep OS — provider base class
// Shared HTTP helpers (JSON POST/GET, basic auth) for provider clients.
// ===========================================================================

import { UnsupportedError } from "./types";

export interface HttpOptions {
  headers?: Record<string, string>;
  basicAuth?: { login: string; password: string };
  bearerToken?: string;
  timeoutMs?: number;
}

export class ProviderHttp {
  constructor(private readonly baseUrl: string, private readonly opts: HttpOptions = {}) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...this.opts.headers,
    };
    if (this.opts.basicAuth) {
      const token = Buffer.from(
        `${this.opts.basicAuth.login}:${this.opts.basicAuth.password}`,
      ).toString("base64");
      headers.authorization = `Basic ${token}`;
    }
    if (this.opts.bearerToken) {
      headers.authorization = `Bearer ${this.opts.bearerToken}`;
    }
    return headers;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.opts.timeoutMs ?? 30_000,
    );
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} from ${path}: ${text.slice(0, 300)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.opts.timeoutMs ?? 30_000,
    );
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} from ${path}: ${text.slice(0, 300)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Base provider that stubs unsupported capabilities. */
export abstract class BaseProvider {
  abstract readonly name: string;
  abstract isConfigured(): boolean;

  protected unsupported(capability: string): never {
    throw new UnsupportedError(this.name, capability);
  }
}
