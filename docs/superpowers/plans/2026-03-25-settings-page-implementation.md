# Settings Page Full Functionality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete settings functionality: user profile editing, password change, household name editing, member role management, and member removal.

**Architecture:** Backend-first approach — add API endpoints first with TDD tests, then frontend hooks, then UI components. Frontend follows existing patterns (TanStack Query mutations, CSS Modules styling).

**Tech Stack:** Bun, Hono, Prisma, React, TanStack Query, Axios, CSS Modules

---

## File Map

### Backend
| File | Responsibility |
|------|----------------|
| `apps/api/src/routes/auth.ts` | Add PATCH /me, POST /change-password |
| `apps/api/src/routes/households.ts` | Add PATCH /:id, PATCH /:id/members/:userId, DELETE /:id/members/:userId |
| `apps/api/src/__tests__/auth.test.ts` | Auth endpoint tests |
| `apps/api/src/__tests__/households.test.ts` | Household endpoint tests |

### Frontend
| File | Responsibility |
|------|----------------|
| `apps/web/src/api/auth.ts` | Add updateProfile, changePassword |
| `apps/web/src/api/households.ts` | Add update, updateMemberRole, removeMember |
| `apps/web/src/hooks/useHouseholds.ts` | Add useUpdateHousehold, useUpdateMemberRole, useRemoveMember |
| `apps/web/src/pages/SettingsPage/index.tsx` | Complete settings UI |
| `apps/web/src/pages/SettingsPage/styles.module.css` | Settings styles |

---

## Backend Tasks

### Task 1: Auth — Update Profile Endpoint

**Files:**
- Modify: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/__tests__/auth.test.ts` (if doesn't exist, else extend)

- [ ] **Step 1: Write failing test for PATCH /auth/me**

```typescript
// In apps/api/src/__tests__/auth.test.ts
describe('PATCH /auth/me', () => {
  it('updates name and returns updated user', async () => {
    const { token } = await createTestUser();

    const res = await api
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
  });

  it('updates email and returns updated user', async () => {
    const { token } = await createTestUser();

    const res = await api
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@example.com');
  });

  it('rejects email that is already taken', async () => {
    const { token } = await createTestUser();
    await createTestUser({ email: 'taken@example.com' });

    const res = await api
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
  });

  it('rejects empty name', async () => {
    const { token } = await createTestUser();

    const res = await api
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await api.patch('/auth/me').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/__tests__/auth.test.ts`
Expected: FAIL — "Route PATCH /auth/me does not exist"

- [ ] **Step 3: Implement PATCH /auth/me endpoint**

```typescript
// In apps/api/src/routes/auth.ts, after the GET /me endpoint:
authRoutes.patch('/me', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user');
  const { name, email } = await c.req.json();

  if (name !== undefined && name.trim().length < 1) {
    return c.json({ error: 'Name is required' }, 400);
  }

  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return c.json({ error: 'Email already in use' }, 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, email },
    select: {
      id: true,
      email: true,
      name: true,
      currentHouseholdId: true,
      createdAt: true,
    },
  });

  return c.json({ user: updated });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/__tests__/auth.test.ts
git commit -m "feat(auth): add PATCH /auth/me endpoint"
```

---

### Task 2: Auth — Change Password Endpoint

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

- [ ] **Step 1: Write failing test for POST /auth/change-password**

```typescript
describe('POST /auth/change-password', () => {
  it('changes password successfully', async () => {
    const { token, userId } = await createTestUser();
    const hashedPassword = await bcrypt.hash('newpassword123', 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    const res = await api
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects wrong current password', async () => {
    const { token } = await createTestUser();

    const res = await api
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Current password is incorrect');
  });

  it('rejects new password shorter than 6 chars', async () => {
    const { token } = await createTestUser();

    const res = await api
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpassword', newPassword: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 6 characters');
  });

  it('returns 401 without token', async () => {
    const res = await api
      .post('/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'newpassword' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/__tests__/auth.test.ts`
Expected: FAIL — "Route POST /auth/change-password does not exist"

- [ ] **Step 3: Implement POST /auth/change-password endpoint**

```typescript
// In apps/api/src/routes/auth.ts, after the PATCH /me endpoint:
authRoutes.post('/change-password', jwtMiddleware, loadUser, async (c) => {
  const user = c.get('user');
  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current and new password are required' }, 400);
  }

  if (newPassword.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const validPassword = await bcrypt.compare(currentPassword, dbUser!.password);

  if (!validPassword) {
    return c.json({ error: 'Current password is incorrect' }, 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return c.json({ success: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/auth.ts
git commit -m "feat(auth): add POST /auth/change-password endpoint"
```

---

### Task 3: Households — Update Household Name

**Files:**
- Modify: `apps/api/src/routes/households.ts`

- [ ] **Step 1: Write failing test for PATCH /households/:householdId**

```typescript
describe('PATCH /households/:householdId', () => {
  it('updates household name as owner', async () => {
    const { token, householdId } = await createTestHousehold();

    const res = await api
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New House Name' });

    expect(res.status).toBe(200);
    expect(res.body.household.name).toBe('New House Name');
  });

  it('updates household name as admin', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'ADMIN' });

    const res = await api
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New House Name' });

    expect(res.status).toBe(200);
  });

  it('rejects update as member', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'MEMBER' });

    const res = await api
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New House Name' });

    expect(res.status).toBe(403);
  });

  it('rejects name shorter than 2 chars', async () => {
    const { token, householdId } = await createTestHousehold();

    const res = await api
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: FAIL — "Route PATCH /households/:householdId does not exist"

- [ ] **Step 3: Implement PATCH /households/:householdId endpoint**

```typescript
// In apps/api/src/routes/households.ts, after the GET /:householdId endpoint:
// Note: Need to add middleware for OWNER/ADMIN check. Add to requireHouseholdMembership
// or create a separate requireHouseholdAdmin middleware.

// First, let's add a helper to check if user is OWNER or ADMIN:
const requireHouseholdAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  const householdId = c.get('householdId');

  const membership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  });

  if (!membership || membership.role === 'MEMBER') {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await next();
};

// Then add the endpoint:
householdsRoutes.patch('/:householdId', jwtMiddleware, loadUser, requireHouseholdMembership, requireHouseholdAdmin, async (c) => {
  const householdId = c.get('householdId');
  const { name } = await c.req.json();

  if (!name || name.trim().length < 2) {
    return c.json({ error: 'Household name is required (min 2 chars)' }, 400);
  }

  const household = await prisma.household.update({
    where: { id: householdId },
    data: { name: name.trim() },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return c.json({ household });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/households.ts
git commit -m "feat(households): add PATCH /households/:householdId endpoint"
```

---

### Task 4: Households — Update Member Role

**Files:**
- Modify: `apps/api/src/routes/households.ts`

- [ ] **Step 1: Write failing test for PATCH /households/:householdId/members/:userId**

```typescript
describe('PATCH /households/:householdId/members/:userId', () => {
  it('owner can change member to admin', async () => {
    const { token, householdId } = await createTestHousehold();
    const memberToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .patch(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('ADMIN');
  });

  it('owner can change admin to member', async () => {
    const { token, householdId } = await createTestHousehold();
    const adminToken = await createTestUserAndJoin(householdId, 'ADMIN');

    const res = await api
      .patch(`/households/${householdId}/members/${adminUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'MEMBER' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('MEMBER');
  });

  it('admin cannot change roles', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'ADMIN' });
    const memberToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .patch(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('member cannot change roles', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'MEMBER' });
    const otherToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .patch(`/households/${householdId}/members/${otherUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('owner cannot demote themselves if sole owner', async () => {
    const { token, householdId } = await createTestHousehold();

    const res = await api
      .patch(`/households/${householdId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'MEMBER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot change your own role');
  });

  it('owner can demote themselves if another owner exists', async () => {
    const { token, householdId } = await createTestHousehold();
    await createTestUserAndJoin(householdId, 'OWNER');

    const res = await api
      .patch(`/households/${householdId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: FAIL — "Route PATCH /households/:householdId/members/:userId does not exist"

- [ ] **Step 3: Implement PATCH /households/:householdId/members/:userId endpoint**

```typescript
// In apps/api/src/routes/households.ts, after the PATCH /:householdId endpoint:
householdsRoutes.patch('/:householdId/members/:userId', jwtMiddleware, loadUser, requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId');
  const targetUserId = c.req.param('userId');
  const user = c.get('user');
  const { role } = await c.req.json();

  // Only OWNER can change roles
  const ownerMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  });

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403);
  }

  // Validate role
  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  // Cannot change own role
  if (user.id === targetUserId) {
    return c.json({ error: 'Cannot change your own role' }, 400);
  }

  // Check if target user is the last OWNER
  const targetMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  });

  if (!targetMembership) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Cannot demote last owner
  if (targetMembership.role === 'OWNER') {
    const ownerCount = await prisma.householdMember.count({
      where: { householdId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      return c.json({ error: 'Cannot demote the last owner' }, 400);
    }
  }

  const updated = await prisma.householdMember.update({
    where: { householdId_userId: { householdId, userId: targetUserId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return c.json({ member: updated });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/households.ts
git commit -m "feat(households): add PATCH /households/:householdId/members/:userId endpoint"
```

---

### Task 5: Households — Remove Member

**Files:**
- Modify: `apps/api/src/routes/households.ts`

- [ ] **Step 1: Write failing test for DELETE /households/:householdId/members/:userId**

```typescript
describe('DELETE /households/:householdId/members/:userId', () => {
  it('owner can remove a member', async () => {
    const { token, householdId } = await createTestHousehold();
    const memberToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .delete(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('owner can remove an admin', async () => {
    const { token, householdId } = await createTestHousehold();
    const adminToken = await createTestUserAndJoin(householdId, 'ADMIN');

    const res = await api
      .delete(`/households/${householdId}/members/${adminUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('admin cannot remove members', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'ADMIN' });
    const memberToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .delete(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('member cannot remove members', async () => {
    const { token, householdId } = await createTestHousehold({ role: 'MEMBER' });
    const otherToken = await createTestUserAndJoin(householdId, 'MEMBER');

    const res = await api
      .delete(`/households/${householdId}/members/${otherUserId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it('owner cannot remove themselves', async () => {
    const { token, householdId } = await createTestHousehold();

    const res = await api
      .delete(`/households/${householdId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot remove yourself. Use leave instead.');
  });

  it('cannot remove the last member', async () => {
    const { token, householdId } = await createTestHousehold();
    const memberToken = await createTestUserAndJoin(householdId, 'MEMBER');

    // Owner leaves first
    await api.delete(`/households/${householdId}/members/${ownerUserId}`).set('Authorization', `Bearer ${token}`);

    // Now member tries to remove themselves (they're the last)
    const res = await api
      .delete(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot remove the last member');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: FAIL — "Route DELETE /households/:householdId/members/:userId does not exist"

- [ ] **Step 3: Implement DELETE /households/:householdId/members/:userId endpoint**

```typescript
// In apps/api/src/routes/households.ts, after the PATCH members endpoint:
householdsRoutes.delete('/:householdId/members/:userId', jwtMiddleware, loadUser, requireHouseholdMembership, async (c) => {
  const householdId = c.get('householdId');
  const targetUserId = c.req.param('userId');
  const user = c.get('user');

  // Only OWNER can remove members
  const ownerMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: user.id } },
  });

  if (ownerMembership?.role !== 'OWNER') {
    return c.json({ error: 'Not authorized' }, 403);
  }

  // Cannot remove yourself
  if (user.id === targetUserId) {
    return c.json({ error: 'Cannot remove yourself. Use leave instead.' }, 400);
  }

  // Check if target exists
  const targetMembership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  });

  if (!targetMembership) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Check if this is the last member
  const memberCount = await prisma.householdMember.count({
    where: { householdId },
  });

  if (memberCount <= 1) {
    return c.json({ error: 'Cannot remove the last member' }, 400);
  }

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId, userId: targetUserId } },
  });

  return c.json({ success: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/__tests__/households.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/households.ts
git commit -m "feat(households): add DELETE /households/:householdId/members/:userId endpoint"
```

---

## Frontend Tasks

### Task 6: Frontend API — Add Auth Update Methods

**Files:**
- Modify: `apps/web/src/api/auth.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/api/__tests__/auth.test.ts
describe('authApi', () => {
  describe('updateProfile', () => {
    it('calls PATCH /auth/me with data', async () => {
      const mockData = { name: 'New Name' };
      apiClient.patch = vi.fn().mockResolvedValue({
        data: { user: { id: '1', name: 'New Name', email: 'test@example.com' } }
      });

      const result = await authApi.updateProfile(mockData);

      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', mockData);
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('calls POST /auth/change-password with data', async () => {
      const mockData = { currentPassword: 'old', newPassword: 'newpassword123' };
      apiClient.post = vi.fn().mockResolvedValue({ data: { success: true } });

      const result = await authApi.changePassword(mockData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', mockData);
      expect(result.success).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test src/api/__tests__/auth.test.ts`
Expected: FAIL — "updateProfile is not a function"

- [ ] **Step 3: Implement updateProfile and changePassword**

```typescript
// In apps/web/src/api/auth.ts
export const authApi = {
  // ... existing methods

  updateProfile: async (data: { name?: string; email?: string }): Promise<User> => {
    const { data: response } = await apiClient.patch<{ user: User }>('/auth/me', data);
    return response.user;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
    const { data: response } = await apiClient.post<{ success: boolean }>('/auth/change-password', data);
    return response;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test src/api/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/auth.ts
git commit -m "feat(web): add updateProfile and changePassword to authApi"
```

---

### Task 7: Frontend API — Add Household Management Methods

**Files:**
- Modify: `apps/web/src/api/households.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/api/__tests__/households.test.ts
describe('householdsApi', () => {
  describe('update', () => {
    it('calls PATCH /households/:id with data', async () => {
      apiClient.patch = vi.fn().mockResolvedValue({
        data: { household: { id: '1', name: 'New Name' } }
      });

      const result = await householdsApi.update('1', { name: 'New Name' });

      expect(apiClient.patch).toHaveBeenCalledWith('/households/1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('updateMemberRole', () => {
    it('calls PATCH /households/:id/members/:userId with role', async () => {
      apiClient.patch = vi.fn().mockResolvedValue({
        data: { member: { userId: '2', role: 'ADMIN' } }
      });

      const result = await householdsApi.updateMemberRole('1', '2', 'ADMIN');

      expect(apiClient.patch).toHaveBeenCalledWith('/households/1/members/2', { role: 'ADMIN' });
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('removeMember', () => {
    it('calls DELETE /households/:id/members/:userId', async () => {
      apiClient.delete = vi.fn().mockResolvedValue({ data: { success: true } });

      await householdsApi.removeMember('1', '2');

      expect(apiClient.delete).toHaveBeenCalledWith('/households/1/members/2');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test src/api/__tests__/households.test.ts`
Expected: FAIL — "updateMemberRole is not a function"

- [ ] **Step 3: Implement the methods**

```typescript
// In apps/web/src/api/households.ts
export const householdsApi = {
  // ... existing methods

  update: async (id: string, data: { name: string }): Promise<Household> => {
    const { data: response } = await apiClient.patch<{ household: Household }>(`/households/${id}`, data);
    return response.household;
  },

  updateMemberRole: async (householdId: string, userId: string, role: 'ADMIN' | 'MEMBER'): Promise<HouseholdMember> => {
    const { data: response } = await apiClient.patch<{ member: HouseholdMember }>(
      `/households/${householdId}/members/${userId}`,
      { role }
    );
    return response.member;
  },

  removeMember: async (householdId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/members/${userId}`);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test src/api/__tests__/households.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/households.ts
git commit -m "feat(web): add update, updateMemberRole, removeMember to householdsApi"
```

---

### Task 8: Frontend Hooks — Add Household Management Hooks

**Files:**
- Modify: `apps/web/src/hooks/useHouseholds.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/hooks/__tests__/useHouseholds.test.ts
describe('useUpdateHousehold', () => {
  it('returns mutation fn that calls api', async () => {
    const { result } = renderHook(() => useUpdateHousehold('hh-1'));
    householdsApi.update = vi.fn().mockResolvedValue({ id: 'hh-1', name: 'New Name' });

    await act(async () => {
      await result.current.mutateAsync({ name: 'New Name' });
    });

    expect(householdsApi.update).toHaveBeenCalledWith('hh-1', { name: 'New Name' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test src/hooks/__tests__/useHouseholds.test.ts`
Expected: FAIL — "useUpdateHousehold is not a function"

- [ ] **Step 3: Implement hooks**

```typescript
// In apps/web/src/hooks/useHouseholds.ts

export function useUpdateHousehold(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => householdsApi.update(householdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}

export function useUpdateMemberRole(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      householdsApi.updateMemberRole(householdId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}

export function useRemoveMember(householdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => householdsApi.removeMember(householdId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEYS.one(householdId) });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test src/hooks/__tests__/useHouseholds.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useHouseholds.ts
git commit -m "feat(web): add useUpdateHousehold, useUpdateMemberRole, useRemoveMember hooks"
```

---

### Task 9: Frontend SettingsPage — Complete UI Rewrite

**Files:**
- Modify: `apps/web/src/pages/SettingsPage/index.tsx`
- Modify: `apps/web/src/pages/SettingsPage/styles.module.css`

- [ ] **Step 1: Write failing test for SettingsPage**

```typescript
// apps/web/src/pages/SettingsPage/__tests__/index.test.tsx
describe('SettingsPage', () => {
  it('shows profile info', async () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('shows edit button for own profile', async () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows household section when user has household', async () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Household')).toBeInTheDocument();
    expect(screen.getByText('Test Household')).toBeInTheDocument();
  });

  it('owner sees role dropdowns for members', async () => {
    renderWithProviders(<SettingsPage />, {
      user: { id: 'owner-id', role: 'OWNER' },
      household: { name: 'Test House', members: [...] }
    });
    // Should show role selects for non-owner members
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test src/pages/SettingsPage/__tests__/index.test.tsx`
Expected: FAIL — test file doesn't exist yet

- [ ] **Step 3: Implement SettingsPage with all functionality**

See design doc for complete component structure. Key sections:

**Profile Section:**
- Display mode: avatar, name, email
- Edit mode: inputs for name/email, Save/Cancel buttons
- Password change button opens modal

**Password Modal:**
- Current password, new password, confirm password fields
- Validation (min 6 chars, passwords match)
- Submit calls changePassword API

**Household Section:**
- Editable name (OWNER/ADMIN see edit icon)
- Invite code generation (existing)
- Members list with role dropdowns (OWNER only for non-OWNER members)
- Remove member buttons (OWNER only, not for self)

**Hook up to mutations:**
```typescript
const updateProfile = useMutation({
  mutationFn: authApi.updateProfile,
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me }); }
});

const changePassword = useMutation({
  mutationFn: authApi.changePassword,
});
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && bun test src/pages/SettingsPage/__tests__/index.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/SettingsPage/index.tsx apps/web/src/pages/SettingsPage/styles.module.css
git commit -m "feat(web): complete SettingsPage implementation with profile edit, password change, household management"
```

---

## Final Verification

- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] Manual testing of all flows:
  - Edit profile (name, email)
  - Change password
  - Edit household name
  - Generate invite code
  - Change member role
  - Remove member
- [ ] No console errors
- [ ] Responsive at 320px, 768px, 1280px