import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/store';
import { testVercelDiagnostics } from '@/lib/vercel/diagnostics';
import { listVercelProjects } from '@/lib/vercel/projects';
import { getVercelConfig } from '@/lib/vercel/client';

export async function GET() {
  try {
    const admin = await requireAdmin();

    const users = db.getAllUsers();
    const projects = db.getAllProjects();
    const deployments = db.getAllDeployments();
    const domains = db.getAllDomains();
    const auditLogs = db.getAuditLogs(30);

    const successfulDeployments = deployments.filter((d) => d.status === 'READY').length;
    const failedDeployments = deployments.filter((d) => d.status === 'ERROR').length;
    const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;

    // Run live Vercel diagnostics
    const diagnostics = await testVercelDiagnostics();
    const config = getVercelConfig();

    let vercelProjectsList: any[] = [];
    if (config.isConfigured) {
      try {
        const vRes = await listVercelProjects();
        if (vRes.ok && vRes.data && Array.isArray(vRes.data.projects)) {
          vercelProjectsList = vRes.data.projects;
        }
      } catch (e) {
        console.warn('Failed to fetch Vercel projects list:', e);
      }
    }

    // Map all projects
    const allProjectsMap = new Map<string, any>();

    // 1. First add local DB projects
    projects.forEach((p) => {
      const owner = users.find((u) => u.id === p.userId);
      const projectDeployments = deployments.filter((d) => d.projectId === p.id);
      const vercelMatch = vercelProjectsList.find(
        (vp) => vp.name.toLowerCase() === p.slug.toLowerCase() || vp.id === p.vercelProjectId
      );
      allProjectsMap.set(p.slug.toLowerCase(), {
        ...p,
        ownerEmail: owner?.email || 'System User',
        deploymentsCount: projectDeployments.length,
        vercelId: vercelMatch?.id || p.vercelProjectId || null,
        vercelFramework: vercelMatch?.framework || p.framework || 'static',
        nodeVersion: vercelMatch?.nodeVersion || '20.x',
        latestDeploymentUrl: vercelMatch?.targets?.production?.url
          ? `https://${vercelMatch.targets.production.url}`
          : `https://${p.subdomain}`,
        isLiveOnVercel: Boolean(vercelMatch),
        source: 'Synced (DB + Vercel API)',
      });
    });

    // 2. Add all remote projects on Vercel that may not be in local DB
    vercelProjectsList.forEach((vp) => {
      const key = vp.name.toLowerCase();
      if (!allProjectsMap.has(key)) {
        allProjectsMap.set(key, {
          id: vp.id,
          userId: 'vercel_account',
          name: vp.name,
          slug: vp.name,
          framework: vp.framework || 'static',
          nodeVersion: vp.nodeVersion || '20.x',
          buildCommand: vp.buildCommand || '',
          installCommand: vp.installCommand || '',
          outputDirectory: vp.outputDirectory || './',
          status: 'ACTIVE',
          subdomain: `${vp.name}.${config.baseDomain}`,
          latestDeploymentUrl: vp.targets?.production?.url ? `https://${vp.targets.production.url}` : `https://${vp.name}.${config.baseDomain}`,
          createdAt: new Date(vp.createdAt).toISOString(),
          updatedAt: new Date(vp.updatedAt || vp.createdAt).toISOString(),
          ownerEmail: 'Vercel API Account',
          deploymentsCount: 1,
          vercelId: vp.id,
          isLiveOnVercel: true,
          source: 'Live Vercel REST API',
        });
      }
    });

    const enrichedProjects = Array.from(allProjectsMap.values());

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        totalProjects: enrichedProjects.length,
        activeProjects,
        totalDeployments: deployments.length,
        successfulDeployments,
        failedDeployments,
        totalDomains: domains.length,
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        projectsCount: projects.filter((p) => p.userId === u.id).length,
        createdAt: u.createdAt,
      })),
      projects: enrichedProjects,
      auditLogs,
      diagnostics,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access restricted to system administrators' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Failed to fetch admin overview' }, { status: 500 });
  }
}
