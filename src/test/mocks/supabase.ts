import { vi } from 'vitest';

// Create chainable mock that returns itself
const createChainableMock = () => {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  
  const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'ilike', 'limit', 'neq', 'in', 'is', 'or', 'match'];
  
  methods.forEach(method => {
    mock[method] = vi.fn(() => mock);
  });
  
  return mock;
};

const chainableMock = createChainableMock();

// Mock Supabase client
export const mockSupabaseClient = {
  ...chainableMock,
  functions: {
    invoke: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    })),
  },
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } }, error: null }),
  },
};

// Reset mocks helper
export function resetSupabaseMocks() {
  Object.keys(chainableMock).forEach(key => {
    chainableMock[key].mockClear();
  });
  mockSupabaseClient.functions.invoke.mockClear();
}

// Helper to set mock return value for queries
export function mockSupabaseQuery(data: unknown, error: unknown = null) {
  chainableMock.single.mockResolvedValue({ data, error });
  chainableMock.limit.mockResolvedValue({ data: Array.isArray(data) ? data : [data], error });
  chainableMock.order.mockResolvedValue({ data: Array.isArray(data) ? data : [data], error });
  chainableMock.select.mockReturnValue({
    ...chainableMock,
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      resolve({ data: Array.isArray(data) ? data : [data], error });
    },
  });
}

// Helper to mock function invocation
export function mockFunctionInvoke(data: unknown, error: unknown = null) {
  mockSupabaseClient.functions.invoke.mockResolvedValue({ data, error });
}
