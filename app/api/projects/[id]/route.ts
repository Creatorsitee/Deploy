import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';
import { deleteVercelProject, updateVercelProject } from '@/lib/vercel/projects';
import { getVercelConfig } from '@/lib/vercel/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = db.getProjectById(id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deployments = db.getDeploymentsByProjectId(project.id);
  const domains = db.getDomainsByProjectId(project.id);
  const envVars = db.getEnvVarsByProjectId(project.id);
  const sysConfig = db.getSystemConfig();

  // Mask env var values for security
  const maskedEnvVars = envVars.map((e) => ({
    ...e,
    value: '••••••••••••••••',
  }));

  return NextResponse.json({
    project: {
      ...project,
      fullSubdomain: project.subdomain || `${project.slug}.${sysConfig.baseDomain}`,
    },
    deployments,
    domains,
    environmentVariables: maskedEnvVars,
    systemConfig: {
      baseDomain: sysConfig.baseDomain,
      availableDomains: sysConfig.availableDomains || [sysConfig.baseDomain],
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = db.getProjectById(id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates: any = {};

  if (body.name) updates.name = body.name.trim();
  if (body.framework) updates.framework = body.framework;
  if (body.buildCommand !== undefined) updates.buildCommand = body.buildCommand;
  if (body.installCommand !== undefined) updates.installCommand = body.installCommand;
  if (body.outputDirectory !== undefined) updates.outputDirectory = body.outputDirectory;

  const updated = db.updateProject(project.id, updates);

  // Sync to Vercel API if configured
  const config = getVercelConfig();
  if (config.isConfigured && (project.vercelProjectId || project.slug)) {
    try {
      await updateVercelProject(project.vercelProjectId || project.slug, {
        name: updates.name,
        buildCommand: updates.buildCommand,
        installCommand: updates.installCommand,
        outputDirectory: updates.outputDirectory,
        framework: updates.framework,
      });
    } catch (e) {
      console.warn('Vercel project patch notice:', e);
    }
  }

  db.addAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'PROJECT_UPDATE',
    metadata: { projectId: project.id, updates },
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = db.getProjectById(id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check confirmation query param or body
  const body = await req.json().catch(() => ({}));
  if (body.force !== true && body.confirmName !== project.name && body.confirmName !== project.slug) {
    return NextResponse.json(
      { error: `Please type "${project.name}" or "${project.slug}" to confirm deletion` },
      { status: 400 }
    );
  }

  // If Vercel project exists and Vercel is configured, attempt clean deletion on Vercel
  const config = getVercelConfig();
  if (config.isConfigured && (project.vercelProjectId || project.slug)) {
    try {
      await deleteVercelProject(project.vercelProjectId || project.slug);
    } catch (err) {
      console.warn('Vercel project cleanup error (non-fatal):', err);
    }
  }

  db.deleteProject(project.id);

  db.addAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'PROJECT_DELETE',
    metadata: { projectId: project.id, slug: project.slug },
  });

  return NextResponse.json({ success: true, message: 'Project successfully deleted' });
}
