'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { authFetch } from '@/lib/auth/client';
import { VERCEL_FRAMEWORKS } from '@/lib/vercel/frameworks';
import FrameworkIcon from '@/components/FrameworkIcon';
import {
  UploadCloud,
  FileArchive,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  Settings2,
  Layers,
  Terminal,
  Clock,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Smartphone,
  RefreshCw,
  QrCode,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
  Zap,
  FolderUp,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { STARTER_TEMPLATES } from '@/lib/templates';
import {
  detectEnvVarsFromZip,
  parseEnvText,
  getTemplateEnvPresets,
  DetectedEnvVar,
} from '@/lib/env-detector';

interface EnvVarItem {
  id: string;
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  visible?: boolean;
  source?: string;
}

export default function NewProjectPage() {
  const router = useRouter();

  // Wizard step
  const [step, setStep] = useState<number>(1);

  // Step 1: Project Details & Domain
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [availableDomains, setAvailableDomains] = useState<string[]>(['cmnty.biz.id']);
  const [selectedDomain, setSelectedDomain] = useState<string>('cmnty.biz.id');

  // Step 2: Source Code
  const [sourceType, setSourceType] = useState<'zip' | 'template' | 'git'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('minimal-portfolio');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');

  // Step 3: Framework & Build Settings & Environment Variables
  const [framework, setFramework] = useState('static');
  const [buildCommand, setBuildCommand] = useState('');
  const [installCommand, setInstallCommand] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('./');

  // Environment variables state
  const [envVars, setEnvVars] = useState<EnvVarItem[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvTargets, setNewEnvTargets] = useState<('production' | 'preview' | 'development')[]>([
    'production',
    'preview',
    'development',
  ]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEnvText, setBulkEnvText] = useState('');

  // Auto-detection state
  const [isScanningEnv, setIsScanningEnv] = useState(false);
  const [detectedSources, setDetectedSources] = useState<string[]>([]);
  const [autoDetectedCount, setAutoDetectedCount] = useState<number>(0);
  const [showDetectedBanner, setShowDetectedBanner] = useState<boolean>(false);

  // Step 4: Deployment Execution
  const [deploying, setDeploying] = useState(false);
  const [deployStepIndex, setDeployStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  // Success Celebration Popup Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedSuccessUrl, setCopiedSuccessUrl] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const envFileInputRef = useRef<HTMLInputElement>(null);

  // Load configured base domains from system config
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.availableDomains) && data.availableDomains.length > 0) {
            setAvailableDomains(data.availableDomains);
            setSelectedDomain(data.baseDomain || data.availableDomains[0]);
          } else if (data.baseDomain) {
            setAvailableDomains([data.baseDomain]);
            setSelectedDomain(data.baseDomain);
          }
        }
      } catch (e) {
        // Fallback default
      }
    }
    loadConfig();
  }, []);

  // Auto-slug generator
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProjectName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setProjectSlug(generated);
  };

  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = STARTER_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setFramework(tmpl.framework);
      setBuildCommand(tmpl.buildCommand);
      setInstallCommand(tmpl.installCommand);
      setOutputDirectory(tmpl.outputDirectory);
    }

    // Auto-detect template preset env vars
    const presets = getTemplateEnvPresets(tmplId);
    if (presets.length > 0) {
      setEnvVars((prev) => {
        const existingKeys = new Set(prev.map((p) => p.key));
        const newVars: EnvVarItem[] = [];
        for (const p of presets) {
          if (!existingKeys.has(p.key)) {
            newVars.push({
              id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              key: p.key,
              value: p.value,
              target: p.target,
              visible: true,
              source: p.source,
            });
          }
        }
        return [...prev, ...newVars];
      });
      setDetectedSources(['Starter Template Preset']);
      setAutoDetectedCount(presets.length);
      setShowDetectedBanner(true);
    }
  };

  // Helper to scan a ZIP file for env vars and framework settings
  const processZipFile = async (file: File) => {
    setZipFile(file);
    const autoName = file.name.replace(/\.zip$/i, '');
    if (!projectName) {
      setProjectName(autoName);
      setProjectSlug(autoName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
    const lowName = file.name.toLowerCase();
    let autoFw = 'nextjs';
    if (lowName.includes('vite')) autoFw = 'vite';
    else if (lowName.includes('astro')) autoFw = 'astro';
    else if (lowName.includes('vue')) autoFw = 'vue';
    else if (lowName.includes('nuxt')) autoFw = 'nuxt';
    else if (lowName.includes('svelte')) autoFw = 'svelte';
    else if (lowName.includes('react')) autoFw = 'react';
    else if (lowName.includes('next')) autoFw = 'nextjs';

    setFramework(autoFw);
    const preset = VERCEL_FRAMEWORKS[autoFw];
    if (preset) {
      setBuildCommand(preset.defaultBuild);
      setOutputDirectory(preset.defaultOutput);
      setInstallCommand(preset.defaultInstall);
    }

    // Automatic detection of environment variables from ZIP
    setIsScanningEnv(true);
    try {
      const { detected, sourcesFound } = await detectEnvVarsFromZip(file);
      if (detected.length > 0) {
        setEnvVars((prev) => {
          const map = new Map<string, EnvVarItem>();
          // Preserve user-added items first
          for (const item of prev) {
            map.set(item.key, item);
          }
          // Add newly detected items if key does not exist yet
          for (const d of detected) {
            if (!map.has(d.key)) {
              map.set(d.key, {
                id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                key: d.key,
                value: d.value,
                target: d.target,
                visible: !!d.value,
                source: d.source,
              });
            }
          }
          return Array.from(map.values());
        });

        setDetectedSources(sourcesFound);
        setAutoDetectedCount(detected.length);
        setShowDetectedBanner(true);
      }
    } catch (e) {
      console.warn('Env scan error:', e);
    } finally {
      setIsScanningEnv(false);
    }
  };

  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        processZipFile(file);
      } else {
        setErrorMessage('Only .zip archives are allowed');
      }
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processZipFile(file);
    }
  };

  // Add Single Environment Variable
  const handleAddEnvVar = () => {
    const cleanKey = newEnvKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!cleanKey) return;

    // Replace if exists, or append
    setEnvVars((prev) => {
      const filtered = prev.filter((e) => e.key !== cleanKey);
      return [
        ...filtered,
        {
          id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          key: cleanKey,
          value: newEnvValue,
          target: newEnvTargets.length > 0 ? newEnvTargets : ['production', 'preview', 'development'],
          visible: false,
          source: 'Manual Entry',
        },
      ];
    });

    setNewEnvKey('');
    setNewEnvValue('');
  };

  // Bulk Import .env file text
  const handleBulkImportEnv = () => {
    if (!bulkEnvText.trim()) return;

    const parsed = parseEnvText(bulkEnvText, 'Pasted .env');
    if (parsed.length === 0) return;

    setEnvVars((prev) => {
      const map = new Map<string, EnvVarItem>();
      for (const p of prev) map.set(p.key, p);
      for (const item of parsed) {
        map.set(item.key, {
          id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          key: item.key,
          value: item.value,
          target: item.target,
          visible: !!item.value,
          source: 'Pasted .env',
        });
      }
      return Array.from(map.values());
    });

    setBulkEnvText('');
    setShowBulkModal(false);
    setAutoDetectedCount(parsed.length);
    setDetectedSources(['Pasted .env file']);
    setShowDetectedBanner(true);
  };

  // Dedicated .env File Picker Handler
  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const parsed = parseEnvText(content, file.name);
          if (parsed.length > 0) {
            setEnvVars((prev) => {
              const map = new Map<string, EnvVarItem>();
              for (const p of prev) map.set(p.key, p);
              for (const item of parsed) {
                map.set(item.key, {
                  id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  key: item.key,
                  value: item.value,
                  target: item.target,
                  visible: !!item.value,
                  source: file.name,
                });
              }
              return Array.from(map.values());
            });

            setAutoDetectedCount(parsed.length);
            setDetectedSources([file.name]);
            setShowDetectedBanner(true);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  // Re-run Auto-Detect from Current ZIP or Template
  const handleTriggerAutoDetect = async () => {
    if (zipFile) {
      setIsScanningEnv(true);
      try {
        const { detected, sourcesFound } = await detectEnvVarsFromZip(zipFile);
        if (detected.length > 0) {
          setEnvVars((prev) => {
            const map = new Map<string, EnvVarItem>();
            for (const p of prev) map.set(p.key, p);
            for (const d of detected) {
              if (!map.has(d.key)) {
                map.set(d.key, {
                  id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  key: d.key,
                  value: d.value,
                  target: d.target,
                  visible: !!d.value,
                  source: d.source,
                });
              }
            }
            return Array.from(map.values());
          });

          setDetectedSources(sourcesFound);
          setAutoDetectedCount(detected.length);
          setShowDetectedBanner(true);
        } else {
          setErrorMessage('No additional environment variables found in ZIP archive.');
        }
      } finally {
        setIsScanningEnv(false);
      }
    } else if (sourceType === 'template') {
      const presets = getTemplateEnvPresets(selectedTemplateId);
      if (presets.length > 0) {
        setEnvVars((prev) => {
          const map = new Map<string, EnvVarItem>();
          for (const p of prev) map.set(p.key, p);
          for (const d of presets) {
            if (!map.has(d.key)) {
              map.set(d.key, {
                id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                key: d.key,
                value: d.value,
                target: d.target,
                visible: !!d.value,
                source: d.source,
              });
            }
          }
          return Array.from(map.values());
        });
        setDetectedSources(['Starter Template Preset']);
        setAutoDetectedCount(presets.length);
        setShowDetectedBanner(true);
      }
    } else {
      envFileInputRef.current?.click();
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    setEnvVars((prev) => prev.filter((e) => e.key !== key));
  };

  const toggleTarget = (target: 'production' | 'preview' | 'development') => {
    if (newEnvTargets.includes(target)) {
      if (newEnvTargets.length > 1) {
        setNewEnvTargets(newEnvTargets.filter((t) => t !== target));
      }
    } else {
      setNewEnvTargets([...newEnvTargets, target]);
    }
  };

  // Start Deployment Pipeline
  const startDeployment = async () => {
    setDeploying(true);
    setErrorMessage('');
    setDeployStepIndex(0);

    try {
      // 1. Create project on backend with selected domain and initial env vars
      setDeployStepIndex(1);
      const projRes = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          slug: projectSlug,
          selectedDomain: selectedDomain,
          framework,
          buildCommand,
          installCommand,
          outputDirectory,
          environmentVariables: envVars.map((e) => ({
            key: e.key,
            value: e.value,
            target: e.target,
          })),
        }),
      });

      const projData = await projRes.json();
      if (!projRes.ok) {
        throw new Error(projData.error || 'Failed to create project');
      }

      const project = projData.project;
      setCreatedProjectId(project.id);

      // 2. Deploy source (ZIP or Template)
      setDeployStepIndex(2);

      let deployRes: Response;
      if (sourceType === 'zip' && zipFile) {
        const formData = new FormData();
        formData.append('projectId', project.id);
        formData.append('file', zipFile);
        deployRes = await authFetch('/api/deploy', {
          method: 'POST',
          body: formData,
        });
      } else if (sourceType === 'template') {
        deployRes = await authFetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            templateId: selectedTemplateId,
          }),
        });
      } else {
        throw new Error('Unsupported source configuration');
      }

      const deployData = await deployRes.json();
      if (!deployRes.ok) {
        throw new Error(deployData.error || 'Deployment failed');
      }

      // 3. Domain binding and SSL verification step
      setDeployStepIndex(3);
      await new Promise((r) => setTimeout(r, 600));

      // 4. Finalization
      setDeployStepIndex(4);
      const fullUrl = `https://${projectSlug}.${selectedDomain}`;
      setFinalUrl(fullUrl);

      // Trigger Celebration Modal automatically
      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during deployment.');
    } finally {
      setDeploying(false);
    }
  };

  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSuccessUrl(true);
    setTimeout(() => setCopiedSuccessUrl(false), 2000);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Projects', href: '/dashboard/projects' },
        { label: 'New Project' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Header */}
        <div className="border-b border-neutral-200/80 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
            Create a New Project
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Deploy your web application instantly with automated routing, SSL, and environment variable synchronization.
          </p>
        </div>

        {/* Multi-step Breadcrumbs Indicator */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { num: 1, label: 'Domain & Name' },
            { num: 2, label: 'Source Files' },
            { num: 3, label: 'Build & Env Vars' },
            { num: 4, label: 'Review & Launch' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition ${
                step === s.num
                  ? 'border-neutral-950 bg-neutral-950 text-white font-semibold shadow-xs'
                  : step > s.num
                  ? 'border-neutral-200 bg-neutral-100/60 text-neutral-800'
                  : 'border-neutral-200/60 bg-white text-neutral-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                  step === s.num
                    ? 'bg-white text-neutral-950 font-bold'
                    : step > s.num
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="truncate hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Configuration Error</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-rose-500 hover:text-rose-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: Project Name & Subdomain Config */}
        {step === 1 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 1: Project & Domain Setup</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Choose a project name and select your desired public subdomain.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                  Project Display Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={handleNameChange}
                  placeholder="my-portfolio-site"
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:border-neutral-950 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                  Assigned Production Domain
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 flex items-center bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden focus-within:border-neutral-950">
                    <span className="pl-3 pr-1 text-xs font-mono text-neutral-400 select-none">https://</span>
                    <input
                      type="text"
                      required
                      value={projectSlug}
                      onChange={(e) =>
                        setProjectSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                        )
                      }
                      placeholder="subdomain-slug"
                      className="flex-1 py-2.5 px-1 bg-transparent text-xs font-mono text-neutral-950 focus:outline-none"
                    />
                    <span className="px-2 text-xs font-mono text-neutral-400">.</span>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="py-2.5 pr-3 bg-neutral-100 text-xs font-mono font-semibold text-neutral-800 border-l border-neutral-200 focus:outline-none cursor-pointer"
                    >
                      {availableDomains.map((dom) => (
                        <option key={dom} value={dom}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Your project will be live immediately at{' '}
                  <span className="font-mono text-neutral-700 font-semibold">
                    https://{projectSlug || 'subdomain'}.{selectedDomain}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                disabled={!projectName.trim() || !projectSlug.trim()}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition active:scale-98 shadow-xs"
              >
                <span>Continue to Source</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Source Code Selection (ZIP or Starter Template) */}
        {step === 2 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 2: Source Code</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Upload a ZIP archive or pick a high-performance starter template.
              </p>
            </div>

            {/* Source Type Switcher */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSourceType('template')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  sourceType === 'template'
                    ? 'border-neutral-950 bg-neutral-50 shadow-2xs ring-1 ring-neutral-950'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-neutral-950 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-neutral-950">Starter Template</div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Launch instantly using tested static & modern presets.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('zip')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  sourceType === 'zip'
                    ? 'border-neutral-950 bg-neutral-50 shadow-2xs ring-1 ring-neutral-950'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-neutral-950 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-neutral-950">Upload ZIP Archive</div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Drag and drop your local project build folder (.zip).
                  </p>
                </div>
              </button>
            </div>

            {/* Template Selector View */}
            {sourceType === 'template' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-neutral-900">
                  Select a Starter Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                        selectedTemplateId === tmpl.id
                          ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-neutral-950">{tmpl.name}</span>
                          <span className="text-[10px] font-mono uppercase bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                            {tmpl.framework}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Ready to deploy · Zero configuration
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ZIP Upload Drag-and-Drop Area */}
            {sourceType === 'zip' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip"
                  onChange={handleZipSelect}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleZipDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-8 sm:p-12 text-center bg-neutral-50/50 hover:bg-neutral-50 transition cursor-pointer space-y-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-700 shadow-2xs">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      {zipFile ? zipFile.name : 'Click or Drag & Drop Project ZIP'}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5">
                      Supports React, Vite, Next.js, Astro, or static HTML (Max 50MB)
                    </span>
                  </div>

                  {isScanningEnv && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auto-detecting environment variables & framework...</span>
                    </div>
                  )}

                  {zipFile && !isScanningEnv && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to extract: {(zipFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={sourceType === 'zip' && !zipFile}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition active:scale-98 shadow-xs"
              >
                <span>Continue to Build Config</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Framework, Build Presets & Environment Variables */}
        {step === 3 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 3: Build Settings & Environment Variables</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Configure your framework build settings and environment variables synchronized to Cloud Engine.
              </p>
            </div>

            {/* Framework Preset Card */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                  Framework Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(VERCEL_FRAMEWORKS).map(([key, fw]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFramework(key);
                        setBuildCommand(fw.defaultBuild);
                        setOutputDirectory(fw.defaultOutput);
                        setInstallCommand(fw.defaultInstall);
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
                        framework === key
                          ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950 font-bold'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                      }`}
                    >
                      <FrameworkIcon frameworkKey={key} className="w-4 h-4 shrink-0" />
                      <span className="text-xs truncate">{fw.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Build and Output Overrides */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    placeholder="npm run build"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={outputDirectory}
                    onChange={(e) => setOutputDirectory(e.target.value)}
                    placeholder="./ or out"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Install Command
                  </label>
                  <input
                    type="text"
                    value={installCommand}
                    onChange={(e) => setInstallCommand(e.target.value)}
                    placeholder="npm install"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>
            </div>

            {/* ENVIRONMENT VARIABLES SECTION WITH AUTO-DETECTION */}
            <div className="border-t border-neutral-200/80 pt-6 space-y-4">
              {/* Hidden file input for .env files */}
              <input
                type="file"
                ref={envFileInputRef}
                accept=".env,.env.*,.txt,.example"
                onChange={handleEnvFileUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-neutral-900" />
                    <h3 className="text-sm font-bold text-neutral-950">Environment Variables</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Encrypted variables automatically injected into build and runtime environments.
                  </p>
                </div>

                {/* Auto-Detection & Import Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTriggerAutoDetect}
                    disabled={isScanningEnv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Scan project code and .env.example files for environment variables"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-600 ${isScanningEnv ? 'animate-spin' : ''}`} />
                    <span>{isScanningEnv ? 'Scanning...' : '⚡ Auto-Detect Env'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => envFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
                    title="Upload a .env or .env.example file"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Upload .env</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Paste .env</span>
                  </button>
                </div>
              </div>

              {/* Auto-Detection Notification Banner */}
              {showDetectedBanner && autoDetectedCount > 0 && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold">Auto-Detection Active: </span>
                      <span>
                        Found <strong className="font-mono">{autoDetectedCount}</strong> variable(s) from{' '}
                        <span className="font-semibold underline underline-offset-2">
                          {detectedSources.join(', ') || 'project code scan'}
                        </span>
                        . Check and configure values below.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetectedBanner(false)}
                    className="text-amber-700 hover:text-amber-950 font-bold text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Add Variable Input Box */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Variable Key</label>
                    <input
                      type="text"
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      placeholder="NEXT_PUBLIC_API_URL"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Variable Value</label>
                    <input
                      type="text"
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="https://api.example.com"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-[11px] font-semibold text-neutral-500 shrink-0">Target Environments:</span>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      {(['production', 'preview', 'development'] as const).map((t) => (
                        <label key={t} className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer capitalize whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={newEnvTargets.includes(t)}
                            onChange={() => toggleTarget(t)}
                            className="rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddEnvVar}
                    disabled={!newEnvKey.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>

              {/* Active List of Variables */}
              {envVars.length > 0 ? (
                <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 text-xs">
                  {envVars.map((env) => (
                    <div key={env.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-neutral-50/50 min-w-0">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono flex-wrap break-all">
                          <span className="font-bold text-neutral-950">{env.key}</span>
                          <span className="text-neutral-400">=</span>
                          <span className="text-neutral-700 break-all font-mono">
                            {env.value ? (env.visible ? env.value : '••••••••••••••••') : <em className="text-neutral-400 font-sans text-[11px]">(empty value)</em>}
                          </span>
                          {env.source && (
                            <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              {env.source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {env.target.map((t) => (
                            <span key={t} className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() =>
                            setEnvVars((prev) =>
                              prev.map((item) => (item.id === env.id ? { ...item, visible: !item.visible } : item))
                            )
                          }
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                          title={env.visible ? 'Hide Value' : 'Show Value'}
                        >
                          {env.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnvVar(env.key)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove Variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-white border border-dashed border-neutral-200 rounded-xl text-center text-xs text-neutral-400">
                  No environment variables added yet. Use Auto-Detect, upload a .env file, or enter keys above.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-98 shadow-xs cursor-pointer"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Trigger Deployment */}
        {step === 4 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 4: Review & Deploy</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Verify your configuration before triggering the deployment engine.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
              <div>
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                  Project Name
                </span>
                <div className="font-bold text-neutral-950 mt-0.5">{projectName}</div>
              </div>
              <div>
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                  Target Subdomain URL
                </span>
                <div className="font-mono font-bold text-neutral-950 mt-0.5 break-all">
                  https://{projectSlug}.{selectedDomain}
                </div>
              </div>
              <div>
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                  Source Type
                </span>
                <div className="capitalize font-medium text-neutral-800 mt-0.5">
                  {sourceType === 'zip'
                    ? `ZIP Archive (${zipFile?.name})`
                    : sourceType === 'template'
                    ? `Starter Template (${selectedTemplateId})`
                    : `Git (${gitUrl})`}
                </div>
              </div>
              <div>
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                  Framework & Env Vars
                </span>
                <div className="font-medium text-neutral-800 mt-0.5 flex items-center gap-2">
                  <span className="uppercase font-mono font-bold">{framework}</span>
                  <span>·</span>
                  <span className="font-semibold text-neutral-900">
                    {envVars.length} Variable{envVars.length !== 1 ? 's' : ''}
                  </span>
                  {autoDetectedCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                      ⚡ Auto-detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Animated Pipeline Stage Checklist */}
            {deploying && (
              <div className="p-6 bg-neutral-950 text-white rounded-2xl space-y-4 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-3">
                   <div className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                     <span className="font-mono uppercase font-semibold text-neutral-200">
                       Deployment Pipeline In Progress...
                     </span>
                   </div>
                </div>

                <div className="space-y-3 pt-1">
                   {[
                     { idx: 1, title: 'Validating Project & Environment Configuration' },
                     { idx: 2, title: 'Transmitting Source Files to Cloud Engine' },
                     { idx: 3, title: `Binding Edge Subdomain (*.${selectedDomain}) & SSL Certificate` },
                     { idx: 4, title: 'Finalizing Live Edge Routing' },
                   ].map((st) => (
                    <div key={st.idx} className="flex items-center gap-3 text-xs">
                      {deployStepIndex > st.idx ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : deployStepIndex === st.idx ? (
                        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-700 shrink-0" />
                      )}
                      <span
                        className={`${
                          deployStepIndex >= st.idx ? 'text-neutral-200 font-medium' : 'text-neutral-600'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-100 flex justify-between">
              <button
                type="button"
                disabled={deploying}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {!finalUrl ? (
                <button
                  type="button"
                  disabled={deploying}
                  onClick={startDeployment}
                  className="inline-flex items-center px-6 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  <span>{deploying ? 'Deploying...' : 'Deploy Project'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                >
                  <span>View Deployment Modal</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BULK IMPORT .ENV MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-900" />
                <h3 className="font-bold text-sm text-neutral-950">Bulk Import Environment Variables</h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-neutral-400 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Paste the raw contents of your <code className="text-neutral-900 font-bold">.env</code> or <code className="text-neutral-900 font-bold">.env.example</code> file below. Each line formatted as <code className="text-neutral-900">KEY=VALUE</code> will be parsed.
            </p>
            <textarea
              rows={8}
              value={bulkEnvText}
              onChange={(e) => setBulkEnvText(e.target.value)}
              placeholder={`NEXT_PUBLIC_API_URL=https://api.example.com\nDATABASE_URL=postgres://...\nJWT_SECRET=super-secret-string`}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-neutral-950"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportEnv}
                disabled={!bulkEnvText.trim()}
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Import Variables
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CELEBRATION POPUP MODAL WITH SCREENSHOT / LIVE PREVIEW MOCKUP */}
      {showSuccessModal && finalUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                  🎉
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-950">Deployment Successful!</h3>
                  <p className="text-[11px] text-neutral-500">Your site is live on high-performance Cloud infrastructure.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Desktop / Mobile Toggle */}
                <div className="hidden sm:flex items-center border border-neutral-200 rounded-lg p-0.5 bg-neutral-100 text-neutral-600">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1 rounded cursor-pointer ${
                      previewDevice === 'desktop' ? 'bg-white text-neutral-950 shadow-2xs font-bold' : ''
                    }`}
                    title="Desktop Preview"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 rounded cursor-pointer ${
                      previewDevice === 'mobile' ? 'bg-white text-neutral-950 shadow-2xs font-bold' : ''
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center text-sm font-semibold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Browser Mockup Frame with Live Iframe */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-neutral-100/40">
              {/* Browser Window Mockup */}
              <div className="border border-neutral-200/80 rounded-xl overflow-hidden bg-white shadow-xs mx-auto transition-all"
                style={{ maxWidth: previewDevice === 'mobile' ? '375px' : '100%' }}
              >
                {/* Browser top navigation bar */}
                <div className="bg-neutral-100 px-3 py-2 border-b border-neutral-200 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>

                  <div className="flex-1 flex items-center bg-white px-2.5 py-1 rounded-md border border-neutral-200 text-[11px] font-mono text-neutral-700 min-w-0 mx-1">
                    <Lock className="w-3 h-3 text-emerald-600 mr-1.5 shrink-0" />
                    <span className="truncate">{finalUrl}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="text-neutral-500 hover:text-neutral-900 p-0.5 cursor-pointer"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Iframe Live Preview */}
                <div className="relative bg-neutral-50 w-full overflow-hidden" style={{ height: previewDevice === 'mobile' ? '400px' : '320px' }}>
                  <iframe
                    key={iframeKey}
                    src={finalUrl}
                    title="Live Website Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    loading="eager"
                  />
                </div>
              </div>

              {/* URL & Quick Actions Card */}
              <div className="p-4 bg-white border border-neutral-200/80 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                      Live Production Domain
                    </div>
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm font-bold text-neutral-900 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{finalUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyUrlToClipboard(finalUrl)}
                      className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSuccessUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSuccessUrl ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="p-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                      title="Show Mobile QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Visit Site</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Collapsible QR Code box */}
                {showQrCode && (
                  <div className="pt-3 border-t border-neutral-100 flex flex-col items-center justify-center p-2 text-center space-y-2">
                    <div className="p-2 bg-white border border-neutral-200 rounded-xl shadow-xs">
                      {/* Generates quick QR code via public SVG service */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                          finalUrl
                        )}`}
                        alt="QR Code"
                        className="w-28 h-28"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500">Scan with your phone to open instantly on mobile</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <span className="text-[11px] text-neutral-500 font-medium">SSL Provisioned · DNS Verified</span>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (createdProjectId) router.push(`/dashboard/projects/${createdProjectId}`);
                  else router.push('/dashboard');
                }}
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
              >
                Go to Project Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
