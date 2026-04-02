// UNIT TEST - Domain Layer
// Tests the User entity permission logic in isolation.

import { User } from '@/lib/domain/User';

describe('User entity', () => {
  const regularUser    = new User('1', 'user@test.com',  'Alice', 'USER',  'APPROVED');
  const pendingAdmin   = new User('2', 'admin@test.com', 'Bob',   'ADMIN', 'PENDING');
  const approvedAdmin  = new User('3', 'super@test.com', 'Carol', 'ADMIN', 'APPROVED');
  const rejectedAdmin  = new User('4', 'bad@test.com',   null,    'ADMIN', 'REJECTED');

  describe('isAdmin()', () => {
    it('returns false for regular users', () => {
      expect(regularUser.isAdmin()).toBe(false);
    });
    it('returns true for admin users', () => {
      expect(approvedAdmin.isAdmin()).toBe(true);
    });
  });

  describe('canAccessAdmin()', () => {
    it('returns false for regular users', () => {
      expect(regularUser.canAccessAdmin()).toBe(false);
    });
    it('returns false for pending admins', () => {
      expect(pendingAdmin.canAccessAdmin()).toBe(false);
    });
    it('returns false for rejected admins', () => {
      expect(rejectedAdmin.canAccessAdmin()).toBe(false);
    });
    it('returns true only for approved admins', () => {
      expect(approvedAdmin.canAccessAdmin()).toBe(true);
    });
  });

  describe('displayName()', () => {
    it('returns name when available', () => {
      expect(regularUser.displayName()).toBe('Alice');
    });
    it('falls back to email when name is null', () => {
      expect(rejectedAdmin.displayName()).toBe('bad@test.com');
    });
  });
});
