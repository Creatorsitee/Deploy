import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const project = db.getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const nextStatus = project.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = db.updateProject(id, { status: nextStatus });

    db.addAuditLog({
      userId: admin.id,
      userEmail: admin.email,
      action: nextStatus === 'SUSPENDED' ? 'PROJECT_SUSPEND' : 'PROJECT_REACTIVATE',
      metadata: { projectId: id, slug: project.slug },
    });

    return NextResponse.json({
      project: updated,
      message: `Project status changed to ${nextStatus}`,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access restricted to system administrators' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
