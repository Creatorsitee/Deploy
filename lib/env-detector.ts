import JSZip from 'jszip';

export interface DetectedEnvVar {
  key: string;
  value: string;
  source: string;
  type: 'example_file' | 'code_scan' | 'template_preset' | 'file_import';
  target: ('production' | 'preview' | 'development')[];
}

// Common system / node built-ins to ignore during code scanning
const IGNORED_SYSTEM_ENV_KEYS = new Set([
  'NODE_ENV',
  'PORT',
  'PATH',
  'PWD',
  'HOME',
  'HOSTNAME',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_MESSAGE',
  'NEXT_RUNTIME',
  'CI',
  'TERM',
  'USER',
  'SHELL',
  'SHLVL',
  'LANG',
  'LC_ALL',
  '_',
]);

/**
 * Parses raw text formatted as .env or KEY=VALUE lines
 */
export function parseEnvText(text: string, source = '.env'): DetectedEnvVar[] {
  if (!text) return [];
  const lines = text.split('\n');
  const results: DetectedEnvVar[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Look for KEY=VALUE or export KEY=VALUE
    const cleanedLine = trimmed.startsWith('export ') ? trimmed.replace(/^export\s+/, '') : trimmed;
    const equalIdx = cleanedLine.indexOf('=');

    let key = '';
    let value = '';

    if (equalIdx > 0) {
      key = cleanedLine.substring(0, equalIdx).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      value = cleanedLine.substring(equalIdx + 1).trim();

      // Strip quotes if wrapped
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
    } else {
      // Key with no value (e.g. just KEY name in template)
      key = cleanedLine.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    }

    if (key && !seen.has(key) && !IGNORED_SYSTEM_ENV_KEYS.has(key)) {
      seen.add(key);
      results.push({
        key,
        value,
        source,
        type: 'file_import',
        target: ['production', 'preview', 'development'],
      });
    }
  }

  return results;
}

/**
 * Scans a ZIP archive file in the browser to auto-detect environment variables
 * from .env.example files, .env.sample, and source code scans.
 */
export async function detectEnvVarsFromZip(zipFile: File | Blob): Promise<{
  detected: DetectedEnvVar[];
  sourcesFound: string[];
}> {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const map = new Map<string, DetectedEnvVar>();
    const sourcesFound: string[] = [];

    // 1. High priority: Scan for .env example / template / defaults files
    const envFilePatterns = [
      /\.env\.example$/i,
      /\.env\.sample$/i,
      /\.env\.template$/i,
      /\.env\.local\.example$/i,
      /\.env\.defaults$/i,
      /\.env\.schema$/i,
      /\.env\.dist$/i,
      /\.env\.development\.example$/i,
      /\.env\.production\.example$/i,
      /\.env$/i,
    ];

    const fileNames = Object.keys(zip.files);

    // First pass: look for .env* files
    for (const fileName of fileNames) {
      const zipEntry = zip.files[fileName];
      if (zipEntry.dir) continue;

      const baseName = fileName.split('/').pop() || '';
      const isEnvFile = envFilePatterns.some((pattern) => pattern.test(baseName));

      if (isEnvFile) {
        try {
          const content = await zipEntry.async('text');
          const parsed = parseEnvText(content, baseName);
          if (parsed.length > 0) {
            sourcesFound.push(baseName);
            for (const item of parsed) {
              map.set(item.key, {
                ...item,
                type: 'example_file',
                source: baseName,
              });
            }
          }
        } catch (e) {
          console.warn('Failed to parse env file in zip:', fileName, e);
        }
      }
    }

    // Second pass: scan code files for process.env.XXX and import.meta.env.XXX
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.vue',
      '.svelte',
      '.astro',
      '.html',
      '.json',
    ];

    let codeScanCount = 0;
    for (const fileName of fileNames) {
      const zipEntry = zip.files[fileName];
      if (zipEntry.dir) continue;

      // Skip node_modules, .git, .next, dist, build directories
      if (
        fileName.includes('node_modules/') ||
        fileName.includes('.git/') ||
        fileName.includes('.next/') ||
        fileName.includes('dist/') ||
        fileName.includes('build/')
      ) {
        continue;
      }

      const hasCodeExt = codeExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
      if (!hasCodeExt) continue;

      try {
        const text = await zipEntry.async('text');
        // Scan for process.env.VAR_NAME or import.meta.env.VAR_NAME
        const regexDot = /(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]{1,60})/g;
        const regexBracket = /(?:process\.env|import\.meta\.env)\[['"]([A-Z][A-Z0-9_]{1,60})['"]\]/g;

        let match;
        while ((match = regexDot.exec(text)) !== null) {
          const key = match[1];
          if (key && !IGNORED_SYSTEM_ENV_KEYS.has(key) && !map.has(key)) {
            map.set(key, {
              key,
              value: '',
              source: fileName.split('/').pop() || 'code',
              type: 'code_scan',
              target: ['production', 'preview', 'development'],
            });
            codeScanCount++;
          }
        }

        while ((match = regexBracket.exec(text)) !== null) {
          const key = match[1];
          if (key && !IGNORED_SYSTEM_ENV_KEYS.has(key) && !map.has(key)) {
            map.set(key, {
              key,
              value: '',
              source: fileName.split('/').pop() || 'code',
              type: 'code_scan',
              target: ['production', 'preview', 'development'],
            });
            codeScanCount++;
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    if (codeScanCount > 0) {
      sourcesFound.push('Code Scan');
    }

    return {
      detected: Array.from(map.values()),
      sourcesFound: Array.from(new Set(sourcesFound)),
    };
  } catch (err) {
    console.warn('Failed to detect environment variables from ZIP:', err);
    return { detected: [], sourcesFound: [] };
  }
}

/**
 * Returns preset environment variables for starter templates
 */
export function getTemplateEnvPresets(templateId: string): DetectedEnvVar[] {
  switch (templateId) {
    case 'minimal-portfolio':
      return [
        {
          key: 'NEXT_PUBLIC_SITE_NAME',
          value: 'Developer Portfolio',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
        {
          key: 'NEXT_PUBLIC_AUTHOR_EMAIL',
          value: 'developer@example.com',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
      ];
    case 'tech-journal':
      return [
        {
          key: 'SITE_TITLE',
          value: 'Tech Journal & Notes',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
        {
          key: 'AUTHOR_NAME',
          value: 'Tech Writer',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
      ];
    case 'saas-landing':
      return [
        {
          key: 'NEXT_PUBLIC_APP_URL',
          value: 'https://cmnty.biz.id',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
        {
          key: 'NEXT_PUBLIC_API_URL',
          value: 'https://api.example.com',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
      ];
    case 'docs-starter':
      return [
        {
          key: 'DOCS_TITLE',
          value: 'Documentation Engine',
          source: 'Template Preset',
          type: 'template_preset',
          target: ['production', 'preview', 'development'],
        },
      ];
    default:
      return [];
  }
}
