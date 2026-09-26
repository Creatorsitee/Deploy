import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';
import { extractZipSafely, detectFramework, executeDeployment } from '@/lib/deployment-service';
import { STARTER_TEMPLATES } from '@/lib/templates';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    if (project.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'This project has been suspended by administration. Contact support.' },
        { status: 403 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let filesToDeploy: { file: string; data: string; encoding?: 'utf-8' | 'base64' }[] = [];
    let sourceType: 'zip' | 'template' | 'git' = 'zip';
    let sourceName = 'Manual Upload';
    let commitMsg = 'Deploy project updates';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      commitMsg = (formData.get('commitMessage') as string) || 'Upload ZIP source';

      if (!file) {
        return NextResponse.json({ error: 'No ZIP file provided in upload' }, { status: 400 });
      }

      if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
        return NextResponse.json({ error: 'Only .zip archives are supported' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractZipSafely(arrayBuffer);

      filesToDeploy = extracted.map((f) => ({
        file: f.file,
        data: f.data,
        encoding: f.encoding,
      }));

      sourceType = 'zip';
      sourceName = file.name;

      // Update framework detection if default
      const detected = detectFramework(filesToDeploy);
      if (detected.framework && detected.framework !== project.framework) {
        db.updateProject(project.id, {
          framework: detected.framework,
          buildCommand: detected.buildCommand || project.buildCommand,
          installCommand: detected.installCommand || project.installCommand,
          outputDirectory: detected.outputDirectory || project.outputDirectory,
        });
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();

      if (body.templateId) {
        const template = STARTER_TEMPLATES.find((t) => t.id === body.templateId);
        if (!template) {
          return NextResponse.json({ error: 'Invalid starter template specified' }, { status: 400 });
        }

        filesToDeploy = template.files.map((f) => ({
          file: f.file,
          data: f.data,
          encoding: 'utf-8',
        }));

        sourceType = 'template';
        sourceName = template.name;
        commitMsg = `Initial deployment with ${template.name}`;

        // Sync template framework & build settings
        db.updateProject(project.id, {
          framework: template.framework,
          buildCommand: template.buildCommand,
          installCommand: template.installCommand,
          outputDirectory: template.outputDirectory,
        });
      } else if (body.redeploy) {
        // Find latest successful deployment or fallback to minimal template
        const prev = db.getDeploymentsByProjectId(project.id);
        const template = STARTER_TEMPLATES[0]; // fallback default
        filesToDeploy = template.files.map((f) => ({
          file: f.file,
          data: f.data,
          encoding: 'utf-8',
        }));
        sourceType = 'template';
        sourceName = prev[0]?.sourceName || 'Redeploy Current Revision';
        commitMsg = 'Manual trigger redeploy';
      } else if (Array.isArray(body.files)) {
        filesToDeploy = body.files;
        sourceType = 'zip';
        sourceName = 'Web Editor';
        commitMsg = body.commitMessage || 'Deploy files from web editor';
      } else {
        return NextResponse.json({ error: 'Invalid deployment payload' }, { status: 400 });
      }
    }

    if (filesToDeploy.length === 0) {
      return NextResponse.json({ error: 'No files provided to deploy' }, { status: 400 });
    }

    // Refresh project in case framework was updated
    const freshProject = db.getProjectById(project.id)!;

    // Execute deployment
    const deployment = await executeDeployment({
      project: freshProject,
      userId: user.id,
      sourceType,
      sourceName,
      files: filesToDeploy,
      commitMessage: commitMsg,
    });

    return NextResponse.json({ deployment });
  } catch (err: any) {
    console.error('Deployment error', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during deployment' },
      { status: 500 }
    );
  }
}
