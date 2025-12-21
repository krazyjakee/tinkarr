import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateToken, generateApiKey, type JwtPayload } from '../utils/jwt';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    apiKey: string;
    isAdmin: boolean;
  };
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { username, password } = credentials;

    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        apiKey: user.apiKey,
        isAdmin: user.isAdmin,
      },
    };
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate API key
    const apiKey = generateApiKey();

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        apiKey,
        isAdmin: false,
      })
      .returning();

    // Generate JWT token
    const payload: JwtPayload = {
      userId: newUser.id,
      username: newUser.username,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        apiKey: newUser.apiKey,
        isAdmin: newUser.isAdmin,
      },
    };
  }

  async getUserById(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      apiKey: user.apiKey,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  }

  async getUserByApiKey(apiKey: string) {
    const [user] = await db.select().from(users).where(eq(users.apiKey, apiKey));

    if (!user) {
      throw new Error('Invalid API key');
    }

    return {
      id: user.id,
      username: user.username,
      apiKey: user.apiKey,
      isAdmin: user.isAdmin,
    };
  }

  async regenerateApiKey(userId: number): Promise<string> {
    const newApiKey = generateApiKey();

    await db.update(users).set({ apiKey: newApiKey }).where(eq(users.id, userId));

    return newApiKey;
  }

  async getAllUsers() {
    const allUsers = await db.select().from(users);

    return allUsers.map(user => ({
      id: user.id,
      username: user.username,
      apiKey: user.apiKey,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async deleteUser(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isAdmin) {
      throw new Error('Cannot delete admin user');
    }

    await db.delete(users).where(eq(users.id, userId));

    return { message: 'User deleted successfully' };
  }

  async resetUserPassword(userId: number, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));

    return { message: 'Password changed successfully' };
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      apiKey: user.apiKey,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
