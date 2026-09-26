import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { verifyPassword, hashPassword } from '@/lib/auth/crypto';
import { createSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();
    const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    let user = db.getUserByEmail(emailTrimmed);

    // Check env-configured admin credentials
    if (
      envAdminEmail &&
      envAdminPassword &&
      emailTrimmed === envAdminEmail &&
      password === envAdminPassword
    ) {
      if (!user) {
        user = db.createUser({
          id: 'usr_env_admin',
          email: envAdminEmail,
          name: process.env.ADMIN_NAME || 'System Admin',
          passwordHash: await hashPassword(envAdminPassword),
          role: 'admin',
          createdAt: new Date().toISOString(),
        });
      } else if (user.role !== 'admin') {
        user = db.updateUser(user.id, { role: 'admin' })!;
      }
    } else {
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    const token = await createSessionCookie(user);

    db.addAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
