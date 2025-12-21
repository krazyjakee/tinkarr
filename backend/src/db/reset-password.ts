import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log('===========================================');
  console.log('  Tinkarr Password Reset Utility');
  console.log('===========================================\n');

  try {
    // Get username
    const username = await question('Enter username to reset password: ');

    if (!username) {
      console.error('Error: Username is required');
      process.exit(1);
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      console.error(`Error: User '${username}' not found`);
      process.exit(1);
    }

    console.log(`\nFound user: ${user.username} (ID: ${user.id})`);
    console.log(`Admin: ${user.isAdmin ? 'Yes' : 'No'}`);

    // Get new password
    const newPassword = await question('\nEnter new password (min 6 characters): ');

    if (!newPassword || newPassword.length < 6) {
      console.error('Error: Password must be at least 6 characters');
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm new password: ');

    if (newPassword !== confirmPassword) {
      console.error('Error: Passwords do not match');
      process.exit(1);
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, user.id));

    console.log('\n✓ Password reset successfully!');
    console.log(`You can now log in with username: ${username}`);
  } catch (error) {
    console.error('\nPassword reset failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

resetPassword();
