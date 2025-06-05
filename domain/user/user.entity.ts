// Entidad de usuario
export class User {
  constructor(
    public readonly userId: string,
    private username: string,
    private email: string,
    private role: UserRole,
    public readonly createdAt: Date,
  ) {}

  public canProcessDocuments(): boolean {
    return [UserRole.ADMIN, UserRole.ACCOUNTANT].includes(this.role)
  }

  public canViewReports(): boolean {
    return [UserRole.ADMIN, UserRole.MANAGER].includes(this.role)
  }

  public updateProfile(username: string, email: string): void {
    this.username = username
    this.email = email
  }

  public assignRole(role: UserRole): void {
    this.role = role
  }

  // Getters
  public getUsername(): string {
    return this.username
  }

  public getEmail(): string {
    return this.email
  }

  public getRole(): UserRole {
    return this.role
  }
}

export enum UserRole {
  ADMIN = "ADMIN",
  ACCOUNTANT = "ACCOUNTANT",
  MANAGER = "MANAGER",
  VIEWER = "VIEWER",
}

