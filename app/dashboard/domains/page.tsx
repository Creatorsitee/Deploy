'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import SslStatusBadge from '@/components/SslStatusBadge';
import { authFetch } from '@/lib/auth/client';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Plus,
} from 'lucide-react';

export default function DomainsManagementPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [baseDomain, setBaseDomain] = useState('cmnty.biz.id');
  const [loading, setLoading] = useState(true);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const fetchDomains = () => {
    authFetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) setProjects(d.projects);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.baseDomain) setBaseDomain(d.baseDomain);
      })
      .catch(() => {});

    authFetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.projects) setProjects(d.projects);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedDomain(url);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Domains' }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
              Domains
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Active CMNTY subdomains and wildcard edge routing.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchDomains();
            }}
            className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 self-start sm:self-auto transition"
            title="Refresh domains"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Domains Table with overflow wrapper */}
        <div className="bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px] whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-neutral-200/80 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Subdomain</th>
                  <th className="px-5 py-3">SSL Status</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {projects.map((p) => {
                  const domainUrl = `https://${p.subdomain}`;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/60 transition">
                      <td className="px-5 py-3.5 font-semibold text-neutral-950">
                        <Link href={`/dashboard/projects/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-neutral-900">
                        <a
                          href={domainUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span>{p.subdomain}</span>
                          <ExternalLink className="w-3 h-3 text-neutral-400 opacity-60" />
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <SslStatusBadge status="ACTIVE" />
                      </td>
                      <td className="px-5 py-3.5 text-[11px] font-mono text-neutral-500">
                        Subdomain
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleCopy(domainUrl)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 transition"
                          title="Copy Domain URL"
                        >
                          {copiedDomain === domainUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 inline" />
                          )}
                        </button>
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
