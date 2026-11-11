# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched is denied for all reads and writes.
2. **Verified Google Identity**: Every write operation requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates its path ID with `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. **PII Isolation (`/managed_users/{userId}`)**:
   - `get`: Only the document owner (`userId == request.auth.uid`) or a verified Admin (`isAdmin()`) may read a user document.
   - `list`: Only verified Admins (`isAdmin()`) or users querying their own `uid` (`resource.data.uid == request.auth.uid`) may list documents. Blanket `isSignedIn()` reads are forbidden.
5. **Privilege Escalation Prevention**:
   - Self-registering non-admin users creating `/managed_users/{userId}` MUST have `userId == request.auth.uid`, `incoming().uid == request.auth.uid`, `incoming().email == request.auth.token.email`, `incoming().role == 'contributor'`, `incoming().status == 'pending'`, and `incoming().canManageUsers == false`, `incoming().canManageSettings == false`, `incoming().canDeleteArticles == false`.
   - Only `isAdmin()` (bootstrapped owner `honguyen6492@gmail.com` with `email_verified == true` or a document in `/admins/{uid}`) can create or update users with elevated roles (`super_admin`, `admin`, `editor`, `author`) or `status == 'active'`.
6. **Temporal Integrity & Immutability**:
   - On `create`, `incoming().createdAt == request.time` and `incoming().updatedAt == request.time`.
   - On `update`, `incoming().createdAt == existing().createdAt`, `incoming().uid == existing().uid`, `incoming().id == existing().id`, and `incoming().updatedAt == request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/managed_users/user_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'honguyen6492@gmail.com', email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Self-Assigned Super Admin Role**: Non-admin user `u2` creates `/managed_users/u2` with `role: 'super_admin'` -> `PERMISSION_DENIED`.
4. **Self-Approved Status Bypass**: Non-admin user `u2` creates `/managed_users/u2` with `status: 'active'` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection (Create)**: User `u2` sends extra key `isSuperHack: true` on `/managed_users/u2` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection (Update)**: User `u2` updates `/managed_users/u2` with extra key `role: 'admin'` -> `PERMISSION_DENIED`.
7. **Identity Spoofing (`uid` mismatch)**: User `u2` creates `/managed_users/u2` with `uid: 'u3'` -> `PERMISSION_DENIED`.
8. **PII Leak (`get` other user)**: Non-admin user `u2` calls `get` on `/managed_users/u3` -> `PERMISSION_DENIED`.
9. **Blanket `list` Scraping**: Non-admin user `u2` queries all `/managed_users` without filtering `uid == 'u2'` -> `PERMISSION_DENIED`.
10. **Denial of Wallet Oversized String**: User `u2` sends `displayName` with 5,000 characters -> `PERMISSION_DENIED`.
11. **Path ID Poisoning**: User `u2` targets `/managed_users/bad$id!@#` -> `PERMISSION_DENIED`.
12. **Timestamp Forgery**: User `u2` sends a past/future `createdAt` or mutates `createdAt` on update -> `PERMISSION_DENIED`.

## 3. Test Runner Specification (`firestore.rules.test.ts`)
```typescript
// Verifies all Dirty Dozen payloads return PERMISSION_DENIED against firestore.rules
```
