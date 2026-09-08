import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", queryClient = createTestQueryClient() }: { route?: string; queryClient?: QueryClient } = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

/**
 * Builds a mock `fetch` implementation for the HelpDesk API. Pass a map of
 * "METHOD path-substring" -> response (or a function returning one) and any
 * unmatched request resolves to a 404 so tests fail loudly instead of
 * hanging on an unresolved request.
 */
export function mockApiFetch(
  handlers: Record<string, unknown | ((url: URL, init?: RequestInit) => unknown)>
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const method = init?.method ?? "GET";
    // Prefer the most specific (longest) matching path fragment so e.g.
    // "GET tickets/t1/comments" wins over the broader "GET tickets" for a
    // comments request, even though both fragments technically match.
    const key = Object.keys(handlers)
      .filter((k) => {
        const [m, pathFragment] = k.split(" ");
        return m === method && url.pathname.includes(pathFragment);
      })
      .sort((a, b) => b.length - a.length)[0];

    if (!key) {
      return new Response(JSON.stringify({ error: `No mock handler for ${method} ${url.pathname}` }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const handler = handlers[key];
    const value = typeof handler === "function" ? (handler as (u: URL, i?: RequestInit) => unknown)(url, init) : handler;
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  });
}
