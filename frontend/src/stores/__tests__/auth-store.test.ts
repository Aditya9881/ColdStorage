import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock at module level — Vitest hoists these
const mockApi = {
  get: vi.fn(),
  login: vi.fn(),
  post: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/lib/api-client', () => ({
  api: mockApi,
  ApiError: class extends Error {
    status: number;
    code: string;
    constructor(s: number, c: string, m: string) { super(m); this.status = s; this.code = c; }
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function getStore() {
    const { useAuthStore } = await import('@/stores/auth-store');
    // Reset store state
    useAuthStore.setState({ user: null, loading: true, isAuthenticated: false });
    return useAuthStore;
  }

  it('has correct initial state', async () => {
    const useAuthStore = await getStore();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.isAuthenticated).toBe(false);
  });

  it('hydrate sets user when API call succeeds', async () => {
    const mockUser = { id: '1', fullName: 'Test User', role: 'ADMIN', phone: '9999999999' };
    mockApi.get.mockResolvedValueOnce({ success: true, data: mockUser });

    const useAuthStore = await getStore();
    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('hydrate sets loading=false even when API call fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    const useAuthStore = await getStore();
    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('login sets user and isAuthenticated', async () => {
    const mockUser = { id: '2', fullName: 'Owner', role: 'OWNER', phone: '8888888888' };
    mockApi.login.mockResolvedValueOnce({ success: true, data: { user: mockUser } });

    const useAuthStore = await getStore();
    const user = await useAuthStore.getState().login('8888888888', 'password');

    expect(user).toEqual(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('login throws on failure', async () => {
    mockApi.login.mockResolvedValueOnce({ success: false });

    const useAuthStore = await getStore();
    await expect(useAuthStore.getState().login('bad', 'creds')).rejects.toThrow('Login failed');
  });

  it('logout clears user state', async () => {
    mockApi.logout.mockResolvedValueOnce({});

    const useAuthStore = await getStore();
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test', role: 'ADMIN' } as any,
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout clears state even if API call fails', async () => {
    mockApi.logout.mockRejectedValueOnce(new Error('Network error'));

    const useAuthStore = await getStore();
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test', role: 'ADMIN' } as any,
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
