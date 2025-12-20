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
    };
  }

  async regenerateApiKey(userId: number): Promise<string> {
    const newApiKey = generateApiKey();

    await db.update(users).set({ apiKey: newApiKey }).where(eq(users.id, userId));

    return newApiKey;
  }
}

export const authService = new AuthService();
