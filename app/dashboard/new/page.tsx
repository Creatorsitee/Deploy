'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { authFetch } from '@/lib/auth/client';
import JSZip from 'jszip';
import { VERCEL_FRAMEWORKS } from '@/lib/vercel/frameworks';
import FrameworkIcon from '@/components/FrameworkIcon';
import {
  UploadCloud,
  FileArchive,
  Sparkles,
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
} from 'lucide-react';
import { STARTER_TEMPLATES } from '@/lib/templates';

interface EnvVarItem {
  id: string;
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  visible?: boolean;
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

  // Environment variables state (Vercel style)
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
  const [detectingEnv, setDetectingEnv] = useState(false);
  const [detectMessage, setDetectMessage] = useState<string | null>(null);

  const handleAutoDetectEnv = async () => {
    setDetectingEnv(true);
    setDetectMessage(null);
    try {
      let foundVars: { key: string; value: string; target: ('production' | 'preview' | 'development')[] }[] = [];

      if (sourceType === 'zip' && zipFile) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        
        let envFileText = '';
        let foundEnvFilename = '';

        for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
          const lowerPath = relativePath.toLowerCase();
          if (!zipEntry.dir && (lowerPath.endsWith('.env') || lowerPath.includes('.env.') || lowerPath.endsWith('env.example'))) {
            foundEnvFilename = relativePath;
            envFileText = await zipEntry.async('text');
            break;
          }
        }

        if (envFileText) {
          const lines = envFileText.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
              const key = trimmed.substring(0, eqIndex).trim().replace(/^export\s+/, '');
              let val = trimmed.substring(eqIndex + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              if (key) {
                foundVars.push({ key, value: val, target: ['production', 'preview', 'development'] });
              }
            }
          }
          setDetectMessage(`✨ Auto-detected variables from "${foundEnvFilename}"!`);
        } else {
          if (zipContent.files['package.json'] || Object.keys(zipContent.files).some(k => k.endsWith('package.json'))) {
            foundVars.push(
              { key: 'NODE_ENV', value: 'production', target: ['production', 'preview', 'development'] },
              { key: 'PORT', value: '3000', target: ['production', 'preview', 'development'] }
            );
            setDetectMessage('✨ Auto-detected Node.js project. Added runtime variables.');
          } else {
            foundVars.push(
              { key: 'NEXT_PUBLIC_APP_URL', value: 'https://' + (projectSlug || 'my-app') + '.cmnty.biz.id', target: ['production', 'preview', 'development'] },
              { key: 'NODE_ENV', value: 'production', target: ['production', 'preview', 'development'] }
            );
            setDetectMessage('✨ Auto-detected standard static project structure.');
          }
        }
      } else {
        if (selectedTemplateId === 'nextjs-starter') {
          foundVars.push(
            { key: 'NEXT_PUBLIC_APP_NAME', value: projectName || 'CMNTY Next App', target: ['production', 'preview', 'development'] },
            { key: 'NODE_ENV', value: 'production', target: ['production', 'preview', 'development'] }
          );
        } else if (selectedTemplateId === 'vite-react') {
          foundVars.push(
            { key: 'VITE_APP_TITLE', value: projectName || 'CMNTY Vite App', target: ['production', 'preview', 'development'] },
            { key: 'PORT', value: '3000', target: ['production', 'preview', 'development'] }
          );
        } else {
          foundVars.push(
            { key: 'APP_ENV', value: 'production', target: ['production', 'preview', 'development'] },
            { key: 'PORT', value: '3000', target: ['production', 'preview', 'development'] }
          );
        }
        setDetectMessage(`✨ Auto-detected recommended variables for "${selectedTemplateId}".`);
      }

      if (foundVars.length > 0) {
        setEnvVars((prev) => {
          const existingKeys = new Set(prev.map(e => e.key));
          const newItems = foundVars.filter(v => !existingKeys.has(v.key)).map(v => ({
            ...v,
            id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            visible: false
          }));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error('Error auto-detecting env:', err);
      setDetectMessage('❌ Failed to parse environment files from archive.');
    } finally {
      setDetectingEnv(false);
      setTimeout(() => setDetectMessage(null), 5000);
    }
  };

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
  };

  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
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
      } else {
        setErrorMessage('Only .zip archives are allowed');
      }
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
        },
      ];
    });

    setNewEnvKey('');
    setNewEnvValue('');
  };

  // Bulk Import .env file text
  const handleBulkImportEnv = () => {
    if (!bulkEnvText.trim()) return;

    const lines = bulkEnvText.split('\n');
    const newItems: EnvVarItem[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const equalIdx = trimmed.indexOf('=');
      if (equalIdx > 0) {
        const key = trimmed.substring(0, equalIdx).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        let value = trimmed.substring(equalIdx + 1).trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key) {
          newItems.push({
            id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            key,
            value,
            target: ['production', 'preview', 'development'],
            visible: false,
          });
        }
      }
    });

    setEnvVars((prev) => {
      const existingKeys = new Set(newItems.map((n) => n.key));
      const filtered = prev.filter((e) => !existingKeys.has(e.key));
      return [...filtered, ...newItems];
    });

    setBulkEnvText('');
    setShowBulkModal(false);
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

      // 2. Dispatch deployment to Vercel API
      setDeployStepIndex(2);
      let deployRes: Response;

      if (sourceType === 'zip' && zipFile) {
        const formData = new FormData();
        formData.append('file', zipFile);
        formData.append('commitMessage', `Initial ZIP upload (${zipFile.name})`);

        deployRes = await authFetch(`/api/projects/${project.id}/deploy`, {
          method: 'POST',
          body: formData,
        });
      } else if (sourceType === 'template') {
        deployRes = await authFetch(`/api/projects/${project.id}/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        });
      } else {
        // Git template
        deployRes = await authFetch(`/api/projects/${project.id}/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: 'minimal-portfolio' }),
        });
      }

      setDeployStepIndex(3);
      const deployData = await deployRes.json();
      if (!deployRes.ok) {
        throw new Error(deployData.error || 'Deployment failed');
      }

      const deployment = deployData.deployment;
      if (deployment.status === 'ERROR') {
        throw new Error(deployment.errorMessage || 'Deployment encountered an error');
      }

      setDeployStepIndex(4);
      const productionUrl = deployment.productionUrl || `https://${projectSlug}.${selectedDomain}`;
      setFinalUrl(productionUrl);

      // Automatically open the success popup modal!
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Deployment error occurred');
      setDeployStepIndex(-1);
    } finally {
      setDeploying(false);
    }
  };

  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSuccessUrl(true);
    setTimeout(() => setCopiedSuccessUrl(false), 2000);
  };

  const fullSubdomainPreview = `https://${projectSlug || 'my-project'}.${selectedDomain}`;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'New Project' }]}>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">Create New Project</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Deploy your web application to production with automated domain provisioning and high-performance edge infrastructure.
          </p>
        </div>

        {/* Multi-step progress indicator: 1 — 2 — 3 — 4 */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 border-b border-neutral-200/80 pb-6 pt-2 text-xs font-semibold">
          {[
            { num: 1, name: 'Name & Domain' },
            { num: 2, name: 'Source Code' },
            { num: 3, name: 'Build & Environment' },
            { num: 4, name: 'Review & Deploy' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (step > s.num) setStep(s.num);
                }}
                disabled={step <= s.num}
                className={`flex items-center gap-2 transition ${
                  step > s.num ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
                title={s.name}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-mono font-bold transition shrink-0 ${
                    step === s.num
                      ? 'bg-neutral-950 text-white shadow-sm ring-2 ring-neutral-950 ring-offset-2'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-300'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-semibold ${
                    step === s.num
                      ? 'text-neutral-950 font-bold'
                      : step > s.num
                      ? 'text-neutral-700'
                      : 'text-neutral-400'
                  }`}
                >
                  {s.name}
                </span>
              </button>

              {idx < 3 && (
                <div
                  className={`h-1.5 sm:h-2 w-10 sm:w-16 md:w-24 rounded-full transition-colors ${
                    step > s.num ? 'bg-neutral-950' : 'bg-neutral-300'
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <div className="font-semibold">Deployment Notice</div>
              <p className="break-words">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Project Name & Multi-Domain Selection */}
        {step === 1 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 1: Project Details & Domain</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Choose a project name and select which domain you would like your subdomain assigned under.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={handleNameChange}
                  placeholder="My Next.js App"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Choose Subdomain & Root Domain
                </label>
                <div className="flex flex-col sm:flex-row items-stretch border border-neutral-300 rounded-lg overflow-hidden focus-within:border-neutral-950 transition bg-neutral-50">
                  <div className="flex items-center flex-1 px-3 py-2 sm:py-2.5">
                    <span className="text-xs font-mono text-neutral-400 mr-1 select-none">https://</span>
                    <input
                      type="text"
                      required
                      value={projectSlug}
                      onChange={(e) =>
                        setProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="my-project"
                      className="w-full text-xs font-mono font-bold text-neutral-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center bg-neutral-100 border-t sm:border-t-0 sm:border-l border-neutral-200 px-3 py-2">
                    <span className="text-xs font-mono text-neutral-500 mr-1.5 font-bold">.</span>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="bg-transparent text-xs font-mono font-bold text-neutral-900 focus:outline-none cursor-pointer"
                    >
                      {availableDomains.map((dom) => (
                        <option key={dom} value={dom}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500">
                  <span>Target URL:</span>
                  <span className="font-mono font-semibold text-neutral-900 break-all">{fullSubdomainPreview}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                disabled={!projectName.trim() || !projectSlug.trim() || projectSlug.length < 3}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-98 disabled:opacity-40"
              >
                <span>Continue to Source</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Source Code */}
        {step === 2 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 2: Source Code</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Select how you want to provide your project files.
              </p>
            </div>

            {/* Source Selection Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setSourceType('template')}
                className={`p-3.5 sm:p-4 border rounded-xl text-left transition flex sm:flex-col justify-between items-start gap-2 ${
                  sourceType === 'template'
                    ? 'border-neutral-950 bg-neutral-50 shadow-2xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-neutral-950">Starter Template</div>
                  <div className="text-[11px] text-neutral-500">Pre-built, ready in 1 click</div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setSourceType('zip')}
                className={`p-3.5 sm:p-4 border rounded-xl text-left transition flex sm:flex-col justify-between items-start gap-2 ${
                  sourceType === 'zip'
                    ? 'border-neutral-950 bg-neutral-50 shadow-2xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-neutral-950">Upload ZIP</div>
                  <div className="text-[11px] text-neutral-500">HTML, Vite, or Next.js</div>
                </div>
                <UploadCloud className="w-4 h-4 text-neutral-900 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setSourceType('git')}
                className={`p-3.5 sm:p-4 border rounded-xl text-left transition flex sm:flex-col justify-between items-start gap-2 ${
                  sourceType === 'git'
                    ? 'border-neutral-950 bg-neutral-50 shadow-2xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-neutral-950">Git Repository</div>
                  <div className="text-[11px] text-neutral-500">GitHub / GitLab URL</div>
                </div>
                <Globe className="w-4 h-4 text-neutral-900 shrink-0" />
              </button>
            </div>

            {/* Template selector */}
            {sourceType === 'template' && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Select a Starter Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition ${
                        selectedTemplateId === tmpl.id
                          ? 'border-neutral-950 bg-neutral-900 text-white shadow-2xs'
                          : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{tmpl.name}</span>
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                            selectedTemplateId === tmpl.id
                              ? 'bg-neutral-800 text-neutral-300'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {tmpl.framework}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-2 leading-relaxed ${
                          selectedTemplateId === tmpl.id ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {tmpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ZIP upload dropzone */}
            {sourceType === 'zip' && (
              <div className="space-y-3 pt-2">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleZipDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition bg-neutral-50 hover:bg-white"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".zip"
                    onChange={handleZipSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500 mb-3">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  {zipFile ? (
                    <div>
                      <div className="text-xs font-bold text-emerald-700">✓ {zipFile.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-1">
                        {(zipFile.size / 1024 / 1024).toFixed(2)} MB · Click or drag another file to replace
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-neutral-900">
                        Drag and drop your project ZIP file here
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        Up to 50MB uncompressed · Contains index.html or package.json
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Git url input */}
            {sourceType === 'git' && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Git Repository URL
                </label>
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-950 transition"
                />
                <p className="text-[11px] text-neutral-500">
                  Public repositories are deployed without requiring tokens.
                </p>
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
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-98 disabled:opacity-40"
              >
                <span>Continue to Build & Env</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Build Settings & Environment Variables */}
        {step === 3 && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-8 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-950">Step 3: Framework & Build Settings</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Configure your framework build settings and environment variables synchronized to Cloud Engine.
              </p>
            </div>

            {/* Build Settings Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Framework Preset
                  </label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-lg focus-within:border-neutral-950 transition">
                    <div className="p-1 bg-white border border-neutral-200 rounded shrink-0 shadow-2xs">
                      <FrameworkIcon frameworkKey={framework} className="w-5 h-5" />
                    </div>
                    <select
                      value={framework}
                      onChange={(e) => {
                        const newFw = e.target.value;
                        setFramework(newFw);
                        const preset = VERCEL_FRAMEWORKS[newFw];
                        if (preset) {
                          setBuildCommand(preset.defaultBuild);
                          setOutputDirectory(preset.defaultOutput);
                          setInstallCommand(preset.defaultInstall);
                        }
                      }}
                      className="w-full py-1.5 bg-transparent text-xs font-bold text-neutral-900 focus:outline-none cursor-pointer"
                    >
                      {Object.entries(VERCEL_FRAMEWORKS).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={outputDirectory}
                    onChange={(e) => setOutputDirectory(e.target.value)}
                    placeholder=".next, dist, build, or ./"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    placeholder="next build, vite build, etc."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Install Command
                  </label>
                  <input
                    type="text"
                    value={installCommand}
                    onChange={(e) => setInstallCommand(e.target.value)}
                    placeholder="npm install"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>
            </div>

            {/* ENVIRONMENT VARIABLES SECTION */}
            <div className="border-t border-neutral-200/80 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-neutral-900" />
                    <h3 className="text-sm font-bold text-neutral-950">Environment Variables</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Encrypted variables injected into build and runtime environments.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoDetectEnv}
                    disabled={detectingEnv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${detectingEnv ? 'animate-spin' : ''}`} />
                    <span>{detectingEnv ? 'Detecting...' : 'Auto Detect Env'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste .env</span>
                  </button>
                </div>
              </div>

              {detectMessage && (
                <div className="p-3 bg-neutral-900 text-white text-xs rounded-xl font-mono flex items-center justify-between shadow-md">
                  <span>{detectMessage}</span>
                  <button onClick={() => setDetectMessage(null)} className="text-neutral-400 hover:text-white ml-2">✕</button>
                </div>
              )}

              {/* Add Variable Input Box */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Key</label>
                    <input
                      type="text"
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      placeholder="NEXT_PUBLIC_API_URL"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Value</label>
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>

              {/* Active List of Variables */}
              {envVars.length > 0 && (
                <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 text-xs">
                  {envVars.map((env) => (
                    <div key={env.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-neutral-50/50 min-w-0">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono flex-wrap break-all">
                          <span className="font-bold text-neutral-950">{env.key}</span>
                          <span className="text-neutral-400">=</span>
                          <span className="text-neutral-700 break-all">
                            {env.visible ? env.value : '••••••••••••••••'}
                          </span>
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
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition"
                          title={env.visible ? 'Hide Value' : 'Show Value'}
                        >
                          {env.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnvVar(env.key)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition"
                          title="Remove Variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-98"
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
                  <span>{envVars.length} Environment Variable{envVars.length !== 1 ? 's' : ''}</span>
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {!finalUrl ? (
                <button
                  type="button"
                  disabled={deploying}
                  onClick={startDeployment}
                  className="inline-flex items-center px-6 py-2.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  <span>{deploying ? 'Deploying...' : 'Deploy Project'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
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
              <h3 className="font-bold text-sm text-neutral-950">Bulk Import Environment Variables</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-neutral-400 hover:text-neutral-900 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Paste the raw contents of your <code className="text-neutral-900">.env</code> file below. Each line formatted as <code className="text-neutral-900">KEY=VALUE</code> will be parsed.
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
                className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportEnv}
                disabled={!bulkEnvText.trim()}
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40"
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
                    className={`p-1 rounded ${
                      previewDevice === 'desktop' ? 'bg-white text-neutral-950 shadow-2xs font-bold' : ''
                    }`}
                    title="Desktop Preview"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 rounded ${
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
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center text-sm font-semibold transition"
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
                    className="text-neutral-500 hover:text-neutral-900 p-0.5"
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
                      className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
                    >
                      {copiedSuccessUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSuccessUrl ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="p-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-700 hover:bg-neutral-50 transition"
                      title="Show Mobile QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5"
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
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
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
