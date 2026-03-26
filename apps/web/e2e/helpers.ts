
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

export async function checkApiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return res.status === 401 || res.ok;
  } catch {
    return false;
  }
}

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    currentHouseholdId: string | null;
  };
}

export async function createTestUser(data: Partial<TestUser> = {}): Promise<TestUser & { id: string }> {
  const email = data.email || `e2e-${Date.now()}@test.com`;
  const password = data.password || 'TestPassword123';
  const name = data.name || 'E2E Test User';

  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    throw new Error(`Register failed: ${res.status}`);
  }

  const body = await res.json();
  return { email, password, name, id: body.user?.id || body.id };
}

export async function loginUser(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const body = await res.json();
  return {
    token: body.token,
    user: body.user,
  };
}

export async function createTestHousehold(token: string, name: string, ownerUserId?: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/households`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`Create household failed: ${res.status}`);
  }

  const body = await res.json();
  const household = body.household;


  if (ownerUserId) {
    await fetch(`${API_URL}/households/${household.id}/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return household;
}

export async function getInviteCode(token: string, householdId: string): Promise<string> {
  const res = await fetch(`${API_URL}/households/${householdId}/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Create invite failed: ${res.status}`);
  }

  const body = await res.json();
  return body.invite.code;
}

export async function joinHousehold(token: string, code: string): Promise<void> {
  const res = await fetch(`${API_URL}/households/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error(`Join household failed: ${res.status}`);
  }
}

export async function createTestTask(
  token: string,
  householdId: string,
  task: { name: string; type?: string; priority?: string; description?: string }
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/households/${householdId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    throw new Error(`Create task failed: ${res.status}`);
  }

  const body = await res.json();
  return body.task;
}

export async function createTestNotice(
  token: string,
  householdId: string,
  notice: { title: string; content: string; priority?: string }
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/households/${householdId}/notices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(notice),
  });

  if (!res.ok) {
    throw new Error(`Create notice failed: ${res.status}`);
  }

  const body = await res.json();
  return body.notice;
}

export async function createTestShoppingList(
  token: string,
  householdId: string,
  name: string
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/households/${householdId}/shopping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`Create shopping list failed: ${res.status}`);
  }

  const body = await res.json();
  return body.list;
}

export async function addShoppingItem(
  token: string,
  householdId: string,
  listId: string,
  name: string,
  quantity?: number
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/households/${householdId}/shopping/${listId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, ...(quantity && { quantity }) }),
  });

  if (!res.ok) {
    throw new Error(`Add shopping item failed: ${res.status}`);
  }

  const body = await res.json();
  return body.item;
}
