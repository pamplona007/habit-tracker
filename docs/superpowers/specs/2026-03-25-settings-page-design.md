# Settings Page Full Functionality — Design

## Overview

Implement complete settings functionality: user profile editing, password change, household management (name, member roles, member removal), and invite code generation.

## 1. Backend API Changes

### 1.1 Auth Routes (`apps/api/src/routes/auth.ts`)

#### `PATCH /auth/me`
- **Purpose**: Update current user's name and email
- **Auth**: JWT required
- **Body**: `{ name?: string; email?: string }`
- **Validation**:
  - Email must be unique (if changed)
  - Name min 1 char if provided
- **Response**: Updated user object
- **Errors**: 400 (validation), 401 (unauthorized), 409 (email conflict)

#### `POST /auth/change-password`
- **Purpose**: Change current user's password
- **Auth**: JWT required
- **Body**: `{ currentPassword: string; newPassword: string }`
- **Validation**:
  - currentPassword must match
  - newPassword min 6 chars
- **Response**: `{ success: true }`
- **Errors**: 400 (validation), 401 (wrong current password)

### 1.2 Household Routes (`apps/api/src/routes/households.ts`)

#### `PATCH /households/:householdId`
- **Purpose**: Update household name
- **Auth**: JWT + household membership
- **Body**: `{ name: string }`
- **Validation**: Name min 2 chars
- **Authorization**: OWNER or ADMIN only
- **Response**: Updated household object
- **Errors**: 400, 401, 403 (not authorized), 404

#### `PATCH /households/:householdId/members/:userId`
- **Purpose**: Update member role
- **Auth**: JWT + household membership
- **Body**: `{ role: 'ADMIN' | 'MEMBER' }`
- **Authorization**: OWNER only
- **Constraints**:
  - Cannot change own role if sole OWNER
  - Cannot change role to OWNER (transfer ownership not in scope)
- **Response**: Updated member object
- **Errors**: 400, 401, 403, 404

#### `DELETE /households/:householdId/members/:userId`
- **Purpose**: Remove member from household
- **Auth**: JWT + household membership
- **Authorization**: OWNER only
- **Constraints**:
  - Cannot remove self (use leave endpoint instead)
  - Cannot remove last member
- **Response**: `{ success: true }`
- **Errors**: 400 (self-removal), 400 (last member), 401, 403, 404

## 2. Frontend Changes

### 2.1 API Layer

#### `apps/web/src/api/auth.ts`
```ts
updateProfile: async (data: { name?: string; email?: string }): Promise<User>
changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }>
```

#### `apps/web/src/api/households.ts`
```ts
update: async (id: string, data: { name: string }): Promise<Household>
updateMemberRole: async (householdId: string, userId: string, role: 'ADMIN' | 'MEMBER'): Promise<HouseholdMember>
removeMember: async (householdId: string, userId: string): Promise<void>
```

### 2.2 Hooks

#### `apps/web/src/hooks/useHouseholds.ts`
```ts
useUpdateHousehold(householdId: string)    // mutation
useUpdateMemberRole(householdId: string)   // mutation
useRemoveMember(householdId: string)       // mutation
```

### 2.3 SettingsPage Components

#### Profile Section (replaces static display)
- Editable fields: name, email
- "Edit" button toggles inline edit mode
- "Save" / "Cancel" buttons
- Loading state during save
- Error display on failure

#### Password Change
- Modal with: current password, new password, confirm password
- Client-side validation: min 6 chars, passwords match
- Shows current user avatar/name

#### Household Section
- Household name: inline edit (OWNER/ADMIN see edit icon)
- Invite code generation: existing functionality works
- Members list: role dropdown (OWNER sees dropdown for non-OWNER members)
- Remove button: OWNER only, next to each non-self member
- Confirmation dialog before removing member

### 2.4 Permissions Mapping

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| Edit own profile | ✓ | ✓ | ✓ |
| Change password | ✓ | ✓ | ✓ |
| Edit household name | ✓ | ✓ | ✗ |
| Generate invite | ✓ | ✓ | ✗ |
| Change member role | ✓ (non-OWNER) | ✗ | ✗ |
| Remove member | ✓ (non-self) | ✗ | ✗ |
| Leave household | ✓ | ✓ | ✓ |

## 3. UI States

### Profile Edit
- Default: display mode (name, email, avatar)
- Edit mode: text inputs, Save/Cancel buttons
- Loading: disabled inputs, spinner on Save
- Error: inline error message below field

### Password Change Modal
- Fields: current password, new password, confirm password
- Validation: all fields required, min 6 chars, passwords match
- Submit: disabled until valid
- Error: banner at top of modal

### Member Role Dropdown
- Current role shown as select value
- Options: ADMIN, MEMBER (OWNER not in options)
- On change: immediate API call with loading state

### Remove Member
- Button with remove icon
- Click: confirmation dialog with member name
- Confirm: API call, then invalidate queries

## 4. Error Handling

- API errors: show toast/alert with message
- Network error: "Connection error, please try again"
- 409 conflict (email taken): "This email is already in use"
- 403 forbidden: "You don't have permission to do this"
- Form validation: inline error messages below fields

## 5. File Changes Summary

### Backend
- `apps/api/src/routes/auth.ts` — add PATCH /me, POST /change-password
- `apps/api/src/routes/households.ts` — add PATCH /:id, PATCH /:id/members/:userId, DELETE /:id/members/:userId

### Frontend
- `apps/web/src/api/auth.ts` — add updateProfile, changePassword
- `apps/web/src/api/households.ts` — add update, updateMemberRole, removeMember
- `apps/web/src/hooks/useHouseholds.ts` — add useUpdateHousehold, useUpdateMemberRole, useRemoveMember
- `apps/web/src/pages/SettingsPage/index.tsx` — complete rewrite with all functionality
- `apps/web/src/pages/SettingsPage/styles.module.css` — update styles

## 6. Testing Requirements

### Backend Tests
- Auth: test update profile, change password (success + validation errors)
- Households: test update name, update role, remove member (success + authorization)

### Frontend Tests
- Profile edit form validation and submission
- Password change modal validation
- Role change flow
- Remove member flow
- Permission enforcement (UI hides/disables based on role)