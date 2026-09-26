import { NextResponse } from 'next/server';
import { STARTER_TEMPLATES } from '@/lib/templates';

export async function GET() {
  const sanitized = STARTER_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    framework: t.framework,
    buildCommand: t.buildCommand,
    installCommand: t.installCommand,
    outputDirectory: t.outputDirectory,
    fileCount: t.files.length,
  }));

  return NextResponse.json({ templates: sanitized });
}
