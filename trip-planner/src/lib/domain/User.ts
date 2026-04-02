// +----------------------------------------------------------+
// ¦  LAYER:   Domain                                         ¦
// ¦  ENTITY:  User                                           ¦
// ¦  PURPOSE: Represents a registered CityCircuit user       ¦
// ¦           and their role within the system               ¦
// +----------------------------------------------------------+

export type UserRole = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly role: UserRole,
    public readonly status: UserStatus
  ) {}

  isAdmin(): boolean {
    return this.role === "ADMIN";
  }

  isApproved(): boolean {
    return this.status === "APPROVED";
  }

  canAccessAdmin(): boolean {
    return this.isAdmin() && this.isApproved();
  }

  displayName(): string {
    return this.name ?? this.email;
  }
}
