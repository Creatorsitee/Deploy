'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { authFetch } from '@/lib/auth/client';
import { useToast } from '@/lib/contexts/ToastContext';
import { safeJson } from '@/lib/fetch-utils';
import {
  Shield,
  Server,
  Users,
  Layers,
  Globe,
  RefreshCw,
  AlertCircle,
  Key,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Search,
  UserCheck,
  UserX,
  Sliders,
  Activity,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { toast, confirmModal } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'domains' | 'infrastructure' | 'logs'>('users');

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Settings configuration form
  const [tokenInput, setTokenInput] = useState('');
  const [teamIdInput, setTeamIdInput] = useState('');
  const [baseDomainInput, setBaseDomainInput] = useState('cmnty.biz.id');
  const [availableDomainsList, setAvailableDomainsList] = useState<string[]>(['cmnty.biz.id']);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [cleaningDb, setCleaningDb] = useState(false);

  const handleCleanDatabase = () => {
    confirmModal({
      title: 'Reset & Clean Database',
      message: 'This will reset test projects, deployments, and logs, keeping only registered user accounts. Continue?',
      confirmText: 'Reset Database',
      danger: true,
      onConfirm: async () => {
        setCleaningDb(true);
        try {
          const res = await authFetch('/api/admin/database/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keepUsers: true }),
          });
          const d = await safeJson(res);
          if (res.ok) {
            toast.success('Database reset successfully! All test projects and logs cleared.');
            loadAdminData();
          } else {
            toast.error(d?.error || 'Failed to clean database');
          }
        } catch (err: any) {
          toast.error(err.message || 'Error cleaning database');
        } finally {
          setCleaningDb(false);
        }
      },
    });
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/overview');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Access restricted to administrators.');
        } else {
          setError('Failed to fetch admin statistics');
        }
        return;
      }
      const json = await safeJson(res);
      if (json) setData(json);

      // Load settings & domains
      const settingsRes = await authFetch('/api/admin/settings');
      if (settingsRes.ok) {
        const sData = await safeJson(settingsRes);
        if (sData) {
          setTeamIdInput(sData.settings?.vercelTeamId || '');
          setBaseDomainInput(sData.settings?.baseDomain || 'cmnty.biz.id');
          setAvailableDomainsList(sData.settings?.availableDomains || [sData.settings?.baseDomain || 'cmnty.biz.id']);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAdmin = async () => {
      try {
        const res = await authFetch('/api/admin/overview');
        if (!res.ok) {
          if (isMounted) {
            if (res.status === 403) {
              setError('Access restricted to administrators.');
            } else {
              setError('Failed to fetch admin statistics');
            }
          }
          return;
        }
        const json = await safeJson(res);
        if (isMounted && json) setData(json);

        const settingsRes = await authFetch('/api/admin/settings');
        if (settingsRes.ok) {
          const sData = await safeJson(settingsRes);
          if (isMounted && sData) {
            setTeamIdInput(sData.settings?.vercelTeamId || '');
            setBaseDomainInput(sData.settings?.baseDomain || 'cmnty.biz.id');
            setAvailableDomainsList(sData.settings?.availableDomains || [sData.settings?.baseDomain || 'cmnty.biz.id']);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading admin data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus('');
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vercelToken: tokenInput,
          vercelTeamId: teamIdInput,
          baseDomain: baseDomainInput,
        }),
      });
      const resJson = await safeJson(res);
      if (res.ok) {
        setSettingsStatus('Settings updated and stored in JSON database. Connection verified.');
        setTokenInput('');
        loadAdminData();
      } else {
        setSettingsStatus(`Error: ${resJson?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSettingsStatus(`Error: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddRootDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDomainInput.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) return;

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addDomain: clean,
        }),
      });
      if (res.ok) {
        setNewDomainInput('');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveRootDomain = (domain: string) => {
    confirmModal({
      title: 'Remove Root Domain',
      message: `Are you sure you want to remove "${domain}" from available domains?`,
      confirmText: 'Remove Domain',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              removeDomain: domain,
            }),
          });
          if (res.ok) {
            toast.success(`Domain "${domain}" removed successfully`);
            loadAdminData();
          } else {
            const d = await safeJson(res);
            toast.error(d?.error || 'Failed to remove domain');
          }
        } catch (err: any) {
          toast.error(err.message || 'Error removing domain');
        }
      },
    });
  };

  const handleSetDefaultDomain = async (domain: string) => {
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseDomain: domain,
        }),
      });
      if (res.ok) {
        toast.success(`Primary domain set to ${domain}`);
        loadAdminData();
      } else {
        const d = await safeJson(res);
        toast.error(d?.error || 'Failed to set primary domain');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error setting primary domain');
    }
  };

  const handleToggleUserRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    confirmModal({
      title: 'Change User Role',
      message: `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`,
      confirmText: 'Update Role',
      danger: newRole === 'admin',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
          if (res.ok) {
            toast.success(`User role updated to ${newRole.toUpperCase()}`);
            loadAdminData();
          } else {
            const d = await safeJson(res);
            toast.error(d?.error || 'Failed to update user role');
          }
        } catch (err: any) {
          toast.error(err.message || 'Error updating user role');
        }
      },
    });
  };

  const handleDeleteUser = (userId: string, userEmail: string) => {
    confirmModal({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user account "${userEmail}"? This will tear down all associated projects.`,
      confirmText: 'Delete Account',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success(`User "${userEmail}" deleted`);
            loadAdminData();
          } else {
            const d = await safeJson(res);
            toast.error(d?.error || 'Failed to delete user');
          }
        } catch (err: any) {
          toast.error(err.message || 'Error deleting user');
        }
      },
    });
  };

  const handleToggleSuspend = async (projectId: string) => {
    try {
      const res = await authFetch(`/api/admin/projects/${projectId}/suspend`, { method: 'POST' });
      if (res.ok) {
        toast.success('Project status toggled');
        loadAdminData();
      } else {
        const d = await safeJson(res);
        toast.error(d?.error || 'Failed to toggle project status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error toggling project status');
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    confirmModal({
      title: 'Delete Project (Admin)',
      message: `Permanently delete project "${projectName}"?`,
      confirmText: 'Permanently Delete',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: true, confirmName: projectName }),
          });
          if (res.ok) {
            toast.success(`Project "${projectName}" permanently deleted`);
            loadAdminData();
          } else {
            const d = await safeJson(res);
            toast.error(d?.error || 'Failed to delete project');
          }
        } catch (err: any) {
          toast.error(err.message || 'Error deleting project');
        }
      },
    });
  };

  if (error) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Admin Panel' }]}>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-2 max-w-md mx-auto my-12">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold">Administrator Access Required</h2>
          <p className="text-xs text-rose-600">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold"
          >
            Return to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats;
  const diagnostics = data?.diagnostics;
  const usersList = data?.users || [];
  const projectsList = data?.projects || [];

  const filteredUsers = usersList.filter(
    (u: any) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProjects = projectsList.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.subdomain?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.ownerEmail?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Admin Panel' }]}>
      <div className="space-y-6 sm:space-y-8 max-w-6xl pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
          <div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">System Administration</h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Global platform management, user oversight, domain routing, and infrastructure control.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              disabled={cleaningDb}
              onClick={handleCleanDatabase}
              className="px-3 py-2 border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 active:scale-95 shadow-2xs cursor-pointer"
              title="Reset test projects, deployments and clear database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningDb ? 'Cleaning DB...' : 'Clean Database'}</span>
            </button>
            <button
              onClick={loadAdminData}
              className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition flex items-center gap-1.5 text-xs font-medium active:scale-95 cursor-pointer"
              title="Refresh statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync & Refresh</span>
            </button>
          </div>
        </div>

        {!diagnostics?.authenticated && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-950">PERINGATAN: Token Vercel Belum Dikonfigurasi!</h3>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Sistem tidak dapat terhubung ke API Vercel. Untuk meng-hosting project, menghapus, atau melihat daftar hosted projects yang sebenarnya, silakan masukkan Token Vercel Anda terlebih dahulu pada tab <strong>&quot;Credentials &amp; Settings&quot;</strong> di bawah.
              </p>
            </div>
          </div>
        )}

        {/* System Stats Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-neutral-950 mt-2 tabular-nums">
              {stats?.totalUsers ?? '—'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Registered platform accounts</div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Projects</span>
              <Server className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-neutral-950 mt-2 tabular-nums">
              {stats?.totalProjects ?? '—'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Deployments active</div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Deployments</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-neutral-950 mt-2 tabular-nums">
              {stats?.totalDeployments ?? '—'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Build runs recorded</div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Infrastructure</span>
              <Server className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  diagnostics?.authenticated ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-base sm:text-lg font-bold text-neutral-950 truncate">
                {diagnostics?.authenticated ? 'Connected' : 'Token Needed'}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {diagnostics?.latencyMs ? `${diagnostics.latencyMs}ms API response` : 'REST API Ready'}
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1 border-b border-neutral-200 overflow-x-auto text-xs font-semibold scrollbar-none pb-0.5">
          {[
            { id: 'users', label: 'Users', icon: Users, count: usersList.length },
            { id: 'projects', label: 'Projects', icon: Server, count: projectsList.length },
            { id: 'domains', label: 'Root Domains', icon: Globe, count: availableDomainsList.length },
            { id: 'infrastructure', label: 'Credentials & Settings', icon: Key },
            { id: 'logs', label: 'Audit Logs', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'border-neutral-950 text-neutral-950 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950">Platform Users</h2>
                <p className="text-xs text-neutral-500">Manage registered user accounts and administrator permissions.</p>
              </div>

              {/* Search user */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user email or name..."
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">User Details</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Hosted Projects</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-neutral-950">{u.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-neutral-800">
                        {u.projectsCount} projects
                      </td>
                      <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.role)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[11px] font-semibold transition"
                        >
                          {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400">
                        No users found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS DIRECTORY */}
        {activeTab === 'projects' && (
          <div className="bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950">Hosted Projects</h2>
                <p className="text-xs text-neutral-500">Overview of all active projects deployed across the platform.</p>
              </div>

              {/* Search project */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search project or subdomain..."
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px] whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Project Name & Slug</th>
                    <th className="px-4 py-3">Framework</th>
                    <th className="px-4 py-3">Owner Account</th>
                    <th className="px-4 py-3">Live URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProjects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-neutral-950 flex items-center gap-1.5">
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                          Created {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs text-neutral-900 uppercase font-semibold">
                          {p.vercelFramework || p.framework || 'static'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600">
                        <div className="font-medium text-neutral-900">{p.ownerEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-700">
                        <a
                          href={p.latestDeploymentUrl || `https://${p.subdomain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-emerald-700 font-semibold"
                        >
                          <span className="truncate max-w-[200px]">{p.subdomain || p.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold border ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {p.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(p.id)}
                          className={`text-xs font-semibold hover:underline ${
                            p.status === 'ACTIVE' ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p.id, p.name)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No projects found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ROOT DOMAINS */}
        {activeTab === 'domains' && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-neutral-900" />
                  <h2 className="text-base font-bold text-neutral-950">Available Root Domains</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Manage the root domains users can select from when deploying their projects and subdomains.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">{availableDomainsList.length} Active Domains</span>
            </div>

            {/* Add New Domain Form */}
            <form onSubmit={handleAddRootDomain} className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <input
                type="text"
                required
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="e.g. cmnty.biz.id, mysite.id"
                className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
              />
              <button
                type="submit"
                disabled={!newDomainInput.trim()}
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Domain</span>
              </button>
            </form>

            {/* List of Available Root Domains */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
              {availableDomainsList.map((dom) => {
                const isDefault = dom === baseDomainInput;
                return (
                  <div key={dom} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-neutral-950 truncate">{dom}</span>
                      {isDefault && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                          Default Base Domain
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultDomain(dom)}
                          className="px-2.5 py-1 border border-neutral-200 text-neutral-700 hover:text-neutral-950 rounded text-xs font-medium hover:bg-neutral-50 transition"
                        >
                          Set as Default
                        </button>
                      )}
                      {availableDomainsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRootDomain(dom)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 transition"
                          title="Delete domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: INFRASTRUCTURE CREDENTIALS */}
        {activeTab === 'infrastructure' && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950">Vercel API Infrastructure Credentials</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Official REST API connection credentials stored securely in the embedded JSON database.
                </p>
              </div>
              <div className="text-xs font-mono">
                Latency: <span className="font-bold">{diagnostics?.latencyMs ? `${diagnostics.latencyMs}ms` : '—'}</span>
              </div>
            </div>

            {diagnostics?.error && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span className="break-words">{diagnostics.error}</span>
              </div>
            )}

            {settingsStatus && (
              <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs text-neutral-800">
                {settingsStatus}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Vercel Token (Server Stored)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter new token to update"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                />
                <span className="text-[10px] text-neutral-400">Stored in server JSON database and never exposed to browser.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Vercel Team ID (Optional)
                </label>
                <input
                  type="text"
                  value={teamIdInput}
                  onChange={(e) => setTeamIdInput(e.target.value)}
                  placeholder="team_..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                />
                <span className="text-[10px] text-neutral-400">Leave blank if deploying to Personal Account.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Default Base Domain
                </label>
                <input
                  type="text"
                  value={baseDomainInput}
                  onChange={(e) => setBaseDomainInput(e.target.value)}
                  placeholder="cmnty.biz.id"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-950"
                />
                <span className="text-[10px] text-neutral-400">Default domain for new projects</span>
              </div>

              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {savingSettings ? 'Verifying & Saving...' : 'Save & Test Vercel Connection'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-6 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-neutral-950">System Audit Trail</h3>
            <div className="font-mono text-[11px] divide-y divide-neutral-100 max-h-96 overflow-y-auto">
              {data?.auditLogs?.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-neutral-600 gap-2">
                  <div className="truncate pr-2">
                    <span className="font-bold text-neutral-950">[{log.action}]</span>{' '}
                    <span>{log.userEmail}</span>
                  </div>
                  <span className="text-neutral-400 text-[10px] shrink-0 font-sans">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
