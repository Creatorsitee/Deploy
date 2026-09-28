'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationSkeleton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string>('');
  const [, startTransition] = useTransition();

  // Trigger skeleton on route change and auto-dismiss after brief smooth pulse
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsNavigating(true);
      setTargetPath(pathname || '');
    }, 0);

    const hideTimer = setTimeout(() => {
      startTransition(() => {
        setIsNavigating(false);
      });
    }, 280);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname, searchParams]);

  // Intercept click on any internal links across the entire website
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Only handle internal links without new tab / modifier keys
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith('/api/') &&
        targetAttr !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl && !href.startsWith('#')) {
          setTargetPath(href.split('?')[0]);
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, []);

  if (!isNavigating) return null;

  const effectivePath = targetPath || pathname || '';

  // 1. Landing Page Skeleton
  if (effectivePath === '/') {
    return (
      <div className="fixed inset-0 z-[99999] bg-white flex flex-col text-neutral-900 pointer-events-none animate-in fade-in duration-100">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-200 animate-pulse shrink-0"></div>
              <div className="h-5 bg-neutral-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 bg-neutral-100 rounded-lg w-20 animate-pulse hidden sm:block"></div>
              <div className="h-8 bg-neutral-200 rounded-lg w-24 animate-pulse"></div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-neutral-200/80">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
              <div className="h-12 sm:h-16 bg-neutral-200 rounded-2xl w-3/4 mx-auto animate-pulse"></div>
              <div className="h-4 sm:h-5 bg-neutral-100 rounded-lg w-2/3 mx-auto animate-pulse"></div>
              <div className="h-4 sm:h-5 bg-neutral-100 rounded-lg w-1/2 mx-auto animate-pulse"></div>
              <div className="flex items-center justify-center gap-3 pt-4">
                <div className="h-10 bg-neutral-200 rounded-lg w-36 animate-pulse"></div>
                <div className="h-10 bg-neutral-100 rounded-lg w-36 animate-pulse"></div>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 bg-[#fafafa] border-b border-neutral-200/80">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white border border-neutral-200/80 rounded-xl p-6 sm:p-7 shadow-2xs animate-pulse space-y-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-neutral-100"></div>
                    <div className="h-5 bg-neutral-200 rounded w-1/2"></div>
                    <div className="h-3.5 bg-neutral-100 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // 2. Documentation Skeleton
  if (effectivePath.startsWith('/docs')) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white flex flex-col text-neutral-900 pointer-events-none animate-in fade-in duration-100">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-200 animate-pulse shrink-0"></div>
              <div className="h-5 bg-neutral-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="h-8 bg-neutral-200 rounded-lg w-28 animate-pulse"></div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            <aside className="hidden md:block md:col-span-3 space-y-6">
              <div className="h-4 bg-neutral-200 rounded w-32 animate-pulse"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-4 bg-neutral-100 rounded w-4/5 animate-pulse"></div>
                ))}
              </div>
            </aside>
            <div className="md:col-span-9 space-y-8">
              <div className="border-b border-neutral-200/80 pb-6 space-y-2">
                <div className="h-8 bg-neutral-200 rounded-xl w-64 animate-pulse"></div>
                <div className="h-4 bg-neutral-100 rounded w-96 animate-pulse"></div>
              </div>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-neutral-200/80 rounded-xl p-6 sm:p-8 shadow-2xs animate-pulse space-y-4"
                >
                  <div className="h-6 bg-neutral-200 rounded w-48"></div>
                  <div className="h-4 bg-neutral-100 rounded w-full"></div>
                  <div className="h-20 bg-neutral-50 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Auth Pages Skeleton (Login / Register / Forgot Password)
  if (
    effectivePath.startsWith('/login') ||
    effectivePath.startsWith('/register') ||
    effectivePath.startsWith('/forgot-password')
  ) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#fafafa] flex flex-col justify-center py-12 px-6 sm:px-8 text-neutral-900 pointer-events-none animate-in fade-in duration-100">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-200 mx-auto animate-pulse"></div>
          <div className="h-7 bg-neutral-200 rounded w-48 mx-auto animate-pulse"></div>
          <div className="h-4 bg-neutral-100 rounded w-64 mx-auto animate-pulse"></div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 sm:px-10 border border-neutral-200/80 rounded-2xl shadow-xs space-y-5 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-20"></div>
              <div className="h-10 bg-neutral-100 rounded-lg w-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-20"></div>
              <div className="h-10 bg-neutral-100 rounded-lg w-full"></div>
            </div>
            <div className="h-10 bg-neutral-200 rounded-lg w-full mt-4"></div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Dashboard Shell Skeleton for All Dashboard Pages & Admin
  const isProjectDetail =
    effectivePath.startsWith('/dashboard/projects/') &&
    effectivePath !== '/dashboard/projects' &&
    effectivePath !== '/dashboard/projects/';

  const isNewProject = effectivePath.startsWith('/dashboard/new');
  const isUsage = effectivePath.startsWith('/dashboard/usage');
  const isProjectsList = effectivePath === '/dashboard/projects' || effectivePath === '/dashboard/projects/';
  const isAdmin = effectivePath.startsWith('/admin');

  return (
    <div className="fixed inset-0 z-[99999] bg-[#fafafa] flex flex-col md:flex-row text-neutral-900 pointer-events-none animate-in fade-in duration-100">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200 bg-white shrink-0">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 animate-pulse shrink-0"></div>
          <div>
            <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse"></div>
            <div className="h-3 bg-neutral-100 rounded w-16 animate-pulse mt-1"></div>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 bg-neutral-100 rounded-lg animate-pulse"></div>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <div className="h-4 bg-neutral-100 rounded w-2/3 animate-pulse"></div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Skeleton */}
        <header className="h-14 sm:h-16 bg-white border-b border-neutral-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="h-4 bg-neutral-200 rounded w-36 animate-pulse"></div>
          <div className="h-8 bg-neutral-200 rounded-lg w-28 animate-pulse"></div>
        </header>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          {/* Specific Skeleton Content Matching Destination Page */}
          {isProjectDetail ? (
            /* Project Detail Skeleton */
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 bg-neutral-200 rounded w-48"></div>
                      <div className="h-5 bg-neutral-100 rounded-full w-16"></div>
                    </div>
                    <div className="h-4 bg-neutral-100 rounded w-64"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 bg-neutral-200 rounded-lg w-24"></div>
                    <div className="h-9 bg-neutral-200 rounded-lg w-28"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white border border-neutral-200 rounded-xl p-5 animate-pulse space-y-3 shadow-2xs"
                  >
                    <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
                    <div className="h-6 bg-neutral-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-b border-neutral-200 pb-2">
                <div className="h-8 bg-neutral-200 rounded-lg w-28 animate-pulse"></div>
                <div className="h-8 bg-neutral-100 rounded-lg w-28 animate-pulse"></div>
                <div className="h-8 bg-neutral-100 rounded-lg w-28 animate-pulse"></div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-6 animate-pulse space-y-4 shadow-2xs">
                <div className="h-5 bg-neutral-200 rounded w-40"></div>
                <div className="h-4 bg-neutral-100 rounded w-full"></div>
                <div className="h-20 bg-neutral-50 rounded-lg mt-4 border border-neutral-100"></div>
              </div>
            </div>
          ) : isNewProject ? (
            /* New Project Wizard Skeleton */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-48"></div>
                <div className="h-3 bg-neutral-100 rounded w-80"></div>
                <div className="flex items-center gap-2 pt-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1 h-2 bg-neutral-100 rounded-full"></div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-xl p-6 sm:p-8 shadow-2xs animate-pulse space-y-6">
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-32"></div>
                  <div className="h-10 bg-neutral-100 rounded-lg w-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="h-28 bg-neutral-50 border border-neutral-100 rounded-xl"></div>
                  <div className="h-28 bg-neutral-50 border border-neutral-100 rounded-xl"></div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
                  <div className="h-9 bg-neutral-100 rounded-lg w-24"></div>
                  <div className="h-9 bg-neutral-200 rounded-lg w-28"></div>
                </div>
              </div>
            </div>
          ) : isUsage ? (
            /* Usage & Limits Skeleton */
            <div className="space-y-6">
              <div className="border-b border-neutral-200/80 pb-5 space-y-2">
                <div className="h-7 bg-neutral-200 rounded w-44 animate-pulse"></div>
                <div className="h-3 bg-neutral-100 rounded w-72 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-36 bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
                      <div className="w-4 h-4 bg-neutral-100 rounded"></div>
                    </div>
                    <div className="h-8 bg-neutral-200 rounded w-1/2"></div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-3"></div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-3">
                <div className="h-5 bg-neutral-200 rounded w-36"></div>
                <div className="h-3 bg-neutral-100 rounded w-4/5"></div>
              </div>
            </div>
          ) : isProjectsList ? (
            /* Projects List Skeleton */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
                <div className="space-y-2">
                  <div className="h-7 bg-neutral-200 rounded w-40 animate-pulse"></div>
                  <div className="h-3 bg-neutral-100 rounded w-64 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 bg-neutral-200 rounded-lg w-28 animate-pulse"></div>
                  <div className="h-9 bg-neutral-200 rounded-lg w-32 animate-pulse"></div>
                </div>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-xl p-3 flex gap-3 shadow-2xs">
                <div className="h-9 bg-neutral-100 rounded-lg flex-1 animate-pulse"></div>
                <div className="h-9 bg-neutral-100 rounded-lg w-28 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-40 bg-white border border-neutral-200 rounded-xl p-5 animate-pulse space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                      <div className="h-5 bg-neutral-100 rounded-full w-14"></div>
                    </div>
                    <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
                    <div className="h-8 bg-neutral-50 rounded-lg mt-4"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : isAdmin ? (
            /* Admin Panel Skeleton */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
                <div className="space-y-2">
                  <div className="h-7 bg-neutral-200 rounded w-48 animate-pulse"></div>
                  <div className="h-3 bg-neutral-100 rounded w-72 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 bg-neutral-100 rounded-lg w-28 animate-pulse"></div>
                  <div className="h-9 bg-neutral-200 rounded-lg w-32 animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white border border-neutral-200/80 rounded-xl p-4 sm:p-5 shadow-2xs animate-pulse space-y-3"
                  >
                    <div className="h-3 bg-neutral-100 rounded w-1/3"></div>
                    <div className="h-8 bg-neutral-200 rounded w-1/2"></div>
                    <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-b border-neutral-200 pb-2">
                <div className="h-8 bg-neutral-200 rounded-lg w-28 animate-pulse"></div>
                <div className="h-8 bg-neutral-100 rounded-lg w-28 animate-pulse"></div>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-hidden p-4 space-y-3">
                <div className="h-9 bg-neutral-100 rounded-lg w-full animate-pulse"></div>
                <div className="space-y-2 pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-neutral-50 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Default Dashboard Overview Skeleton */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
                <div className="space-y-2">
                  <div className="h-7 bg-neutral-200 rounded-lg w-56 animate-pulse"></div>
                  <div className="h-3.5 bg-neutral-100 rounded w-72 animate-pulse"></div>
                </div>
                <div className="h-9 bg-neutral-200 rounded-lg w-36 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-3">
                  <div className="h-3.5 bg-neutral-100 rounded w-28"></div>
                  <div className="h-8 bg-neutral-200 rounded w-20"></div>
                  <div className="h-2 bg-neutral-100 rounded-full w-full"></div>
                </div>
                <div className="bg-white border border-neutral-200/80 rounded-xl p-5 sm:p-6 shadow-2xs animate-pulse space-y-3">
                  <div className="h-3.5 bg-neutral-100 rounded w-28"></div>
                  <div className="h-8 bg-neutral-200 rounded w-20"></div>
                  <div className="h-2 bg-neutral-100 rounded-full w-full"></div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="h-5 bg-neutral-200 rounded w-36 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-2xs animate-pulse space-y-4"
                    >
                      <div className="h-5 bg-neutral-200 rounded w-1/2"></div>
                      <div className="h-3.5 bg-neutral-100 rounded w-3/4"></div>
                      <div className="h-3 bg-neutral-100 rounded w-20 pt-2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
