import type {
  ApproveCharityRequest,
  CompleteSignupRequest,
  CreateItemRequest,
  ExpressInterestRequest,
  FinalizeRecipientRequest,
  RejectCharityRequest,
  UpdateWishlistRequest,
} from '../schemas/requests.js';
import type { Charity } from '../schemas/charity.js';
import type { Item } from '../schemas/item.js';
import type { User } from '../schemas/user.js';

export type AuthTokenGetter = () => Promise<string | null>;

export type ApiClientOptions = {
  baseUrl: string;
  getAuthToken: AuthTokenGetter;
  fetchImpl?: typeof fetch;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createApiClient(opts: ApiClientOptions) {
  const fetchFn = opts.fetchImpl ?? fetch;
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const token = await opts.getAuthToken();
    const url = new URL(joinUrl(opts.baseUrl, path));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetchFn(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? safeParse(text) : null;
    if (!res.ok) {
      const message =
        (json && typeof json === 'object' && 'message' in json && typeof json.message === 'string'
          ? json.message
          : null) ?? `Request failed: ${res.status}`;
      const code =
        json && typeof json === 'object' && 'code' in json && typeof json.code === 'string'
          ? json.code
          : undefined;
      throw new ApiError(res.status, message, code, json);
    }
    return json as T;
  }

  return {
    completeSignup(body: CompleteSignupRequest) {
      return request<{ user: User; charity?: Charity }>('POST', '/auth/complete-signup', body);
    },
    me() {
      return request<{ user: User; charity?: Charity }>('GET', '/me');
    },
    createItem(body: CreateItemRequest) {
      return request<{ item: Item }>('POST', '/items', body);
    },
    rescanItem(itemId: string) {
      return request<{ item: Item }>('POST', `/items/${itemId}/scan`);
    },
    finalizeRecipient(itemId: string, body: FinalizeRecipientRequest) {
      return request<{ item: Item }>('POST', `/items/${itemId}/finalize-recipient`, body);
    },
    expressInterest(itemId: string, body: ExpressInterestRequest) {
      return request<{ ok: true }>('POST', `/items/${itemId}/interests`, body);
    },
    withdrawInterest(itemId: string, charityId: string) {
      return request<{ ok: true }>('DELETE', `/items/${itemId}/interests/${charityId}`);
    },
    updateWishlist(charityId: string, body: UpdateWishlistRequest) {
      return request<{ ok: true }>('PUT', `/charities/${charityId}/wishlist`, body);
    },
    approveCharity(charityId: string, body: ApproveCharityRequest) {
      return request<{ charity: Charity }>('POST', `/admin/charities/${charityId}/approve`, body);
    },
    rejectCharity(charityId: string, body: RejectCharityRequest) {
      return request<{ charity: Charity }>('POST', `/admin/charities/${charityId}/reject`, body);
    },
    pendingCharities() {
      return request<{ charities: Charity[] }>('GET', '/admin/charities/pending');
    },
    geocode(q: string) {
      return request<{ lat: number; lng: number; city?: string; postalCode?: string }>(
        'GET',
        '/geocode',
        undefined,
        { q },
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function joinUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
