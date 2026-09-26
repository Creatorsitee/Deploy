import { NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { getVercelConfig } from '@/lib/vercel/client';

export async function GET() {
  try {
    const config = getVercelConfig();
    const sys = db.getSystemConfig();

    return NextResponse.json({
      baseDomain: config.baseDomain || sys.baseDomain || 'cmnty.biz.id',
      availableDomains: sys.availableDomains || [config.baseDomain || 'cmnty.biz.id'],
      isVercelConfigured: config.isConfigured,
      allowPublicRegistration: sys.allowPublicRegistration,
    });
  } catch (err: any) {
    return NextResponse.json(
      { baseDomain: 'cmnty.biz.id', availableDomains: ['cmnty.biz.id'], isVercelConfigured: false, allowPublicRegistration: true },
      { status: 200 }
    );
  }
}

