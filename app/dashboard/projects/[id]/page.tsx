'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import DeploymentStatusBadge from '@/components/DeploymentStatusBadge';
import SslStatusBadge from '@/components/SslStatusBadge';
import { authFetch } from '@/lib/auth/client';
import { VERCEL_FRAMEWORKS } from '@/lib/vercel/frameworks';
import FrameworkIcon from '@/components/FrameworkIcon';
import { parseEnvText } from '@/lib/env-detector';
import {
  ExternalLink,
  RefreshCw,
  Rocket,
  Globe,
  Layers,
  Key,
  Settings as SettingsIcon,
  Trash2,
  Copy,
  Check,
  Plus,
  Terminal,
  AlertCircle,
  Clock,
  Lock,
  FolderUp,
  FileText,
  Zap,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [envVars, setEnvVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'domains' | 'env' | 'settings'>('overview');

  // Logs modal
  const [selectedDeployment, setSelectedDeployment] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleInspectDeployment = async (dep: any) => {
    setSelectedDeployment(dep);
    setLoadingLogs(true);
    try {
      const res = await authFetch(`/api/deployments/${dep.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.deployment) {
          setSelectedDeployment(data.deployment);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Vercel logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // New domain form
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState('');

  // New env var form
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvTargets, setNewEnvTargets] = useState<('production' | 'preview' | 'development')[]>([
    'production',
    'preview',
    'development',
  ]);
  const [showBulkEnvModal, setShowBulkEnvModal] = useState(false);
  const [bulkEnvText, setBulkEnvText] = useState('');
  const [addingEnv, setAddingEnv] = useState(false);
  const envFileInputRef = useRef<HTMLInputElement>(null);

  // Settings form
  const [nameInput, setNameInput] = useState('');
  const [frameworkInput, setFrameworkInput] = useState('static');
  const [nodeVersionInput, setNodeVersionInput] = useState('20.x');
  const [buildCmdInput, setBuildCmdInput] = useState('');
  const [installCmdInput, setInstallCmdInput] = useState('');
  const [outputDirInput, setOutputDirInput] = useState('');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  // Action states
  const [redeploying, setRedeploying] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const refreshProject = async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 404) router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setProject(data.project);
      setDeployments(data.deployments || []);
      setDomains(data.domains || []);
      setEnvVars(data.environmentVariables || []);

      setNameInput(data.project.name);
      setFrameworkInput(data.project.framework || 'static');
      setNodeVersionInput(data.project.nodeVersion || '20.x');
      setBuildCmdInput(data.project.buildCommand || '');
      setInstallCmdInput(data.project.installCommand || '');
      setOutputDirInput(data.project.outputDirectory || './');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!projectId) return;

    authFetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) router.push('/dashboard');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted || !data) return;
        setProject(data.project);
        setDeployments(data.deployments || []);
        setDomains(data.domains || []);
        setEnvVars(data.environmentVariables || []);
        setNameInput(data.project.name);
        setBuildCmdInput(data.project.buildCommand || '');
        setInstallCmdInput(data.project.installCommand || '');
        setOutputDirInput(data.project.outputDirectory || './');
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, router]);

  const handleRedeploy = async () => {
    setRedeploying(true);
    try {
      const res = await authFetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redeploy: true }),
      });
      const data = await res.json();
      if (res.ok) {
        refreshProject();
        setActiveTab('deployments');
      } else {
        alert(data.error || 'Failed to trigger redeploy');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRedeploying(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError('');
    setAddingDomain(true);
    try {
      const res = await authFetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add domain');
      setNewDomain('');
      refreshProject();
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setDomainError('');
    }
  };

  const handleVerifyDomain = async (domainName: string) => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/domains/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainName }),
      });
      const data = await res.json();
      alert(data.message || 'Domain check completed');
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveDomain = async (domainName: string) => {
    if (!confirm(`Are you sure you want to remove domain ${domainName}?`)) return;
    try {
      await authFetch(`/api/projects/${projectId}/domains?domain=${encodeURIComponent(domainName)}`, {
        method: 'DELETE',
      });
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEnv(true);
    try {
      const res = await authFetch(`/api/projects/${projectId}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newEnvKey,
          value: newEnvValue,
          target: newEnvTargets.length > 0 ? newEnvTargets : ['production', 'preview', 'development'],
        }),
      });
      if (res.ok) {
        setNewEnvKey('');
        setNewEnvValue('');
        refreshProject();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingEnv(false);
    }
  };

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (content) {
          const parsed = parseEnvText(content, file.name);
          for (const item of parsed) {
            await authFetch(`/api/projects/${projectId}/env`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: item.key,
                value: item.value,
                target: item.target,
              }),
            });
          }
          refreshProject();
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBulkEnvImport = async () => {
    if (!bulkEnvText.trim()) return;
    const parsed = parseEnvText(bulkEnvText, 'Pasted .env');
    for (const item of parsed) {
      await authFetch(`/api/projects/${projectId}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: item.key,
          value: item.value,
          target: item.target,
        }),
      });
    }
    setBulkEnvText('');
    setShowBulkEnvModal(false);
    refreshProject();
  };

  const handleDeleteEnv = async (key: string) => {
    if (!confirm(`Delete environment variable ${key}?`)) return;
    try {
      await authFetch(`/api/projects/${projectId}/env?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage('');
    try {
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          framework: frameworkInput,
          nodeVersion: nodeVersionInput,
          buildCommand: buildCmdInput,
          installCommand: installCmdInput,
          outputDirectory: outputDirInput,
        }),
      });
      if (res.ok) {
        setSettingsMessage('Project settings saved successfully');
        refreshProject();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmInput !== project.name && deleteConfirmInput !== project.slug) {
      alert(`Type "${project.name}" or "${project.slug}" to confirm deletion`);
      return;
    }
    try {
      const res = await authFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteConfirmInput }),
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
          <span className="text-xs text-neutral-500 font-mono">Loading project data...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  const latestDeployment = deployments[0];
  const prodUrl = `https://${project.subdomain}`;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Projects', href: '/dashboard' }, { label: project.name }]}>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 truncate">
                {project.name}
              </h1>
              {latestDeployment && <DeploymentStatusBadge status={latestDeployment.status} />}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono truncate">
              <span>{project.slug}</span>
              <span>·</span>
              <span className="uppercase">{project.framework}</span>
              <span>·</span>
              <a
                href={prodUrl}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-900 font-semibold hover:underline flex items-center gap-1 truncate"
              >
                <span className="truncate">{project.subdomain}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={() => handleCopyUrl(prodUrl)}
              className="px-3 py-1.5 sm:py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
            <a
              href={prodUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 sm:py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>Visit Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleRedeploy}
              disabled={redeploying}
              className="px-3.5 py-1.5 sm:py-2 border border-neutral-200 text-neutral-900 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${redeploying ? 'animate-spin' : ''}`} />
              <span>{redeploying ? 'Redeploying...' : 'Redeploy'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Responsive Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-px text-xs font-semibold overflow-x-auto no-scrollbar flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'deployments', label: `Deployments (${deployments.length})`, icon: Clock },
            { id: 'domains', label: `Domains (${domains.length})`, icon: Globe },
            { id: 'env', label: `Environment (${envVars.length})`, icon: Key },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b-2 transition shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'border-neutral-950 text-neutral-950'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Production Deployment */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Production Deployment
                  </div>
                  {latestDeployment && <DeploymentStatusBadge status={latestDeployment.status} />}
                </div>

                {latestDeployment ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                          Live URL
                        </div>
                        <a
                          href={latestDeployment.productionUrl || prodUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm font-bold text-neutral-900 hover:underline flex items-center gap-1.5"
                        >
                          <span>{latestDeployment.productionUrl || prodUrl}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <SslStatusBadge status="ACTIVE" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Source</span>
                        <div className="font-semibold text-neutral-900 mt-0.5 truncate">
                          {latestDeployment.sourceName || 'Direct'}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Build Time</span>
                        <div className="font-mono font-semibold text-neutral-900 mt-0.5">
                          {latestDeployment.durationMs
                            ? `${(latestDeployment.durationMs / 1000).toFixed(1)}s`
                            : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Created</span>
                        <div className="font-semibold text-neutral-900 mt-0.5">
                          {new Date(latestDeployment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Engine</span>
                        <div className="font-semibold text-neutral-900 mt-0.5">Cloud Edge API</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInspectDeployment(latestDeployment)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Inspect Build Logs</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No deployments created for this project yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right col: Build settings & info */}
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Build Configuration
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-semibold">Framework</span>
                    <div className="font-mono uppercase font-bold text-neutral-950 mt-0.5">
                      {project.framework}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-semibold">Build Command</span>
                    <div className="font-mono text-neutral-800 mt-0.5 bg-neutral-50 p-1.5 rounded border border-neutral-100">
                      {project.buildCommand || 'None (Static)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase font-semibold">Output Directory</span>
                    <div className="font-mono text-neutral-800 mt-0.5 bg-neutral-50 p-1.5 rounded border border-neutral-100">
                      {project.outputDirectory || './'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPLOYMENTS */}
        {activeTab === 'deployments' && (
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-950">Deployment History</h3>
                <p className="text-xs text-neutral-500">All builds dispatched to cloud infrastructure.</p>
              </div>
              <button
                onClick={handleRedeploy}
                disabled={redeploying}
                className="px-3.5 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
              >
                Trigger Deploy
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Commit / Source</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {deployments.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <DeploymentStatusBadge status={d.status} />
                      </td>
                      <td className="px-6 py-3.5 max-w-xs truncate">
                        <div className="font-semibold text-neutral-900 truncate">
                          {d.commitMessage || 'Manual deployment'}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono truncate">
                          {d.sourceName || d.id}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-600">
                        {d.durationMs ? `${(d.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-neutral-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleInspectDeployment(d)}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          View Logs
                        </button>
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-500 hover:text-neutral-900"
                            title="Open direct deployment URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5 inline" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DOMAINS */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-neutral-950">Assigned Domain & Subdomains</h3>
                <span className="text-xs font-mono text-neutral-500">{domains.length} active</span>
              </div>

              <div className="divide-y divide-neutral-100">
                {domains.map((dom) => (
                  <div key={dom.id} className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-neutral-950">{dom.domain}</span>
                          {dom.isSubdomain && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                              Subdomain Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <SslStatusBadge status={dom.sslStatus} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleVerifyDomain(dom.domain)}
                          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3 text-neutral-500" />
                          <span>Verify DNS & SSL</span>
                        </button>

                        <a
                          href={`https://${dom.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition"
                          title="Visit domain"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {!dom.isSubdomain && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(dom.domain)}
                            className="p-2 border border-neutral-200 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove domain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ENVIRONMENT VARIABLES */}
        {activeTab === 'env' && (
          <div className="space-y-6">
            <input
              type="file"
              ref={envFileInputRef}
              accept=".env,.env.*,.txt,.example"
              onChange={handleEnvFileUpload}
              className="hidden"
            />

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-950">Add Environment Variable</h3>
                  <p className="text-xs text-neutral-500">
                    Variables are encrypted and synced to build and runtime pipelines.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
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
                    onClick={() => setShowBulkEnvModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Paste .env</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddEnv} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    placeholder="API_KEY"
                    className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                  <input
                    type="password"
                    required
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="Secret value"
                    className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-neutral-500">Target:</span>
                    {(['production', 'preview', 'development'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer capitalize">
                        <input
                          type="checkbox"
                          checked={newEnvTargets.includes(t)}
                          onChange={() => {
                            if (newEnvTargets.includes(t)) {
                              if (newEnvTargets.length > 1) setNewEnvTargets(newEnvTargets.filter((x) => x !== t));
                            } else {
                              setNewEnvTargets([...newEnvTargets, t]);
                            }
                          }}
                          className="rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={addingEnv || !newEnvKey.trim()}
                    className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {addingEnv ? 'Saving...' : 'Add Variable'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h3 className="font-bold text-sm text-neutral-950">Active Environment Variables</h3>
              </div>

              {envVars.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No environment variables added to this project yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {envVars.map((e) => (
                    <div key={e.id} className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{e.key}</span>
                          <span className="text-neutral-400">=</span>
                          <span className="text-neutral-400">{e.value}</span>
                        </div>
                        {Array.isArray(e.target) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {e.target.map((t: string) => (
                              <span key={t} className="text-[10px] uppercase font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEnv(e.key)}
                        className="text-neutral-400 hover:text-rose-600 transition self-end sm:self-auto"
                        title="Delete variable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BULK ENV MODAL */}
        {showBulkEnvModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-bold text-sm text-neutral-950">Bulk Import .env Variables</h3>
                <button
                  onClick={() => setShowBulkEnvModal(false)}
                  className="text-neutral-400 hover:text-neutral-900 text-xs font-semibold"
                >
                  ✕
                </button>
              </div>
              <textarea
                rows={8}
                value={bulkEnvText}
                onChange={(e) => setBulkEnvText(e.target.value)}
                placeholder={`KEY=VALUE\nANOTHER_KEY=VALUE`}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-neutral-950"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkEnvModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkEnvImport}
                  disabled={!bulkEnvText.trim()}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-neutral-950">Project Settings</h3>

              {settingsMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  {settingsMessage}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Project Display Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full max-w-md px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Framework Preset
                  </label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-lg max-w-md focus-within:border-neutral-950 transition">
                    <div className="p-1 bg-white border border-neutral-200 rounded shrink-0 shadow-2xs">
                      <FrameworkIcon frameworkKey={frameworkInput} className="w-5 h-5" />
                    </div>
                    <select
                      value={frameworkInput}
                      onChange={(e) => {
                        const fw = e.target.value;
                        setFrameworkInput(fw);
                        const preset = VERCEL_FRAMEWORKS[fw];
                        if (preset) {
                          setBuildCmdInput(preset.defaultBuild);
                          setOutputDirInput(preset.defaultOutput);
                          setInstallCmdInput(preset.defaultInstall);
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Node.js Version
                  </label>
                  <select
                    value={nodeVersionInput}
                    onChange={(e) => setNodeVersionInput(e.target.value)}
                    className="w-full max-w-md px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950 cursor-pointer"
                  >
                    <option value="20.x">20.x (Recommended Default)</option>
                    <option value="18.x">18.x (LTS)</option>
                    <option value="22.x">22.x (Latest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={buildCmdInput}
                    onChange={(e) => setBuildCmdInput(e.target.value)}
                    placeholder="npm run build"
                    className="w-full max-w-md px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Install Command
                  </label>
                  <input
                    type="text"
                    value={installCmdInput}
                    onChange={(e) => setInstallCmdInput(e.target.value)}
                    placeholder="npm install"
                    className="w-full max-w-md px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={outputDirInput}
                    onChange={(e) => setOutputDirInput(e.target.value)}
                    placeholder="./ or dist"
                    className="w-full max-w-md px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
                >
                  Save Settings
                </button>
              </form>
            </div>

            {/* Danger Zone: Delete Project */}
            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-rose-700">Danger Zone: Delete Project</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Permanently deletes this project, releases the custom subdomain, and tears down all deployment records. This action cannot be undone.
              </p>
              <div className="space-y-2 max-w-md">
                <label className="block text-xs text-neutral-500">
                  Type <span className="font-bold font-mono text-neutral-900">{project.name}</span> to confirm:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder={project.name}
                    className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-rose-600"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={deleteConfirmInput !== project.name && deleteConfirmInput !== project.slug}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-40"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Build Logs Modal */}
        {selectedDeployment && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-neutral-950 text-white border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 px-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Build Logo Icon */}
                  <svg className="w-4 h-4 text-white fill-current shrink-0" viewBox="0 0 512 512">
                    <path d="M256 48L512 464H0L256 48Z" />
                  </svg>
                  <div>
                    <div className="font-mono text-xs font-bold flex items-center gap-2">
                      <span>Build Inspector</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      Deployment ID: {selectedDeployment.vercelDeploymentId || selectedDeployment.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleInspectDeployment(selectedDeployment)}
                    disabled={loadingLogs}
                    className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition text-xs flex items-center gap-1.5"
                    title="Refresh build logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-emerald-400' : ''}`} />
                    <span className="hidden sm:inline">Refresh Logs</span>
                  </button>
                  <button
                    onClick={() => setSelectedDeployment(null)}
                    className="text-neutral-400 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Status Header */}
              <div className="px-6 py-2 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Status:</span>
                  <span className="font-bold text-emerald-400">{selectedDeployment.status}</span>
                </div>
                <div className="text-neutral-400 text-[11px]">
                  {selectedDeployment.createdAt ? new Date(selectedDeployment.createdAt).toLocaleString() : ''}
                </div>
              </div>

              {/* Log Stream Body */}
              <div className="p-6 overflow-y-auto font-mono text-xs text-neutral-300 space-y-1.5 flex-1 bg-black/40 selection:bg-white selection:text-black">
                {loadingLogs ? (
                  <div className="flex items-center gap-2 text-neutral-400 py-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Streaming build logs directly from cloud deployment edge...</span>
                  </div>
                ) : selectedDeployment.logs && selectedDeployment.logs.length > 0 ? (
                  selectedDeployment.logs.map((line: string, i: number) => (
                    <div key={i} className="leading-relaxed whitespace-pre-wrap font-mono">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 py-4">No build logs recorded from edge yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
