export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  framework: 'static' | 'vite' | 'react' | 'astro';
  buildCommand: string;
  installCommand: string;
  outputDirectory: string;
  files: { file: string; data: string }[];
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'minimal-portfolio',
    name: 'Minimalist Developer Portfolio',
    description: 'Clean, typography-driven developer portfolio with project showcases, skills, and contact card.',
    framework: 'static',
    buildCommand: '',
    installCommand: '',
    outputDirectory: './',
    files: [
      {
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Developer Portfolio — Hosted on CMNTY</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-[#fafafa] text-neutral-900 min-h-screen antialiased flex flex-col justify-between">
  <div class="max-w-3xl mx-auto px-6 py-16 w-full">
    <header class="mb-12 border-b border-neutral-200 pb-8">
      <div class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
        <span>Available for Projects</span>
        <span>·</span>
        <span>Hosted via CMNTY</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">Alex Rivera</h1>
      <p class="mt-2 text-lg text-neutral-600">Full-Stack Engineer building high-performance web applications and cloud architecture.</p>
    </header>

    <section class="mb-12">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-6">Selected Work</h2>
      <div class="space-y-6">
        <div class="p-6 bg-white border border-neutral-200 rounded-xl transition hover:border-neutral-400">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-neutral-900">HyperGraph Engine</h3>
            <span class="text-xs text-neutral-500">2026</span>
          </div>
          <p class="mt-2 text-sm text-neutral-600">Real-time edge cache visualization and distributed state synchronization tool.</p>
          <div class="mt-4 flex gap-2 text-xs text-neutral-500">
            <span>TypeScript</span> · <span>Next.js</span> · <span>Vercel Edge</span>
          </div>
        </div>

        <div class="p-6 bg-white border border-neutral-200 rounded-xl transition hover:border-neutral-400">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-neutral-900">Vortex UI Design System</h3>
            <span class="text-xs text-neutral-500">2025</span>
          </div>
          <p class="mt-2 text-sm text-neutral-600">Accessible zero-dependency design tokens and component primitives for engineering teams.</p>
          <div class="mt-4 flex gap-2 text-xs text-neutral-500">
            <span>React</span> · <span>Tailwind CSS</span> · <span>Radix</span>
          </div>
        </div>
      </div>
    </section>

    <section class="p-6 bg-neutral-900 text-white rounded-xl">
      <h2 class="text-lg font-semibold">Deploy on CMNTY</h2>
      <p class="mt-1 text-sm text-neutral-400">This site is hosted instantly with free automated SSL and custom subdomain provisioning.</p>
    </section>
  </div>

  <footer class="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
    <p>© 2026 Alex Rivera · Built & Deployed on CMNTY Hosting</p>
  </footer>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'tech-journal',
    name: 'Developer Journal & Notes',
    description: 'Clean responsive technical publication with dark/light aesthetics and code highlights.',
    framework: 'static',
    buildCommand: '',
    installCommand: '',
    outputDirectory: './',
    files: [
      {
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Journal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-neutral-900 min-h-screen max-w-2xl mx-auto px-6 py-12 antialiased">
  <div class="border-b border-neutral-200 pb-6 mb-8 flex justify-between items-center">
    <div class="font-bold text-lg tracking-tight">CMNTY Journal</div>
    <div class="text-xs text-neutral-500">Architecture & Notes</div>
  </div>
  <article class="prose prose-neutral">
    <div class="text-xs text-neutral-500 mb-2">September 25, 2026 · 4 min read</div>
    <h1 class="text-2xl font-bold tracking-tight">Decoupling Edge Deployments from Custom Domains</h1>
    <p class="mt-4 text-neutral-700 leading-relaxed">
      In modern web infrastructure, utilizing official edge APIs allows platforms to provide instant global deployments while maintaining full control over brand subdomains and security rules.
    </p>
    <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6 font-mono text-xs text-neutral-800">
      curl -X POST https://api.cmnty.biz.id/v1/deploy \\<br>
      &nbsp;&nbsp;-H "Authorization: Bearer cmnty_..." \\<br>
      &nbsp;&nbsp;-F "file=@project.zip"
    </div>
    <p class="text-neutral-700 leading-relaxed">
      With wildcard DNS (*.domain.com) pointed directly to edge Anycast IPs and automated SSL certificate verification, deployments transition from queue to production in under 15 seconds.
    </p>
  </article>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'saas-landing',
    name: 'Modern Product Waitlist',
    description: 'High-converting product landing page with clean waitlist signup and feature cards.',
    framework: 'static',
    buildCommand: '',
    installCommand: '',
    outputDirectory: './',
    files: [
      {
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse — Modern Workspace Insights</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0c0d0e] text-white min-h-screen flex flex-col justify-between antialiased">
  <nav class="max-w-5xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-neutral-800">
    <div class="font-bold tracking-tight text-lg">PULSE</div>
    <div class="text-xs text-neutral-400">Deployed via CMNTY</div>
  </nav>

  <main class="max-w-3xl mx-auto px-6 py-20 text-center">
    <div class="inline-block text-xs font-semibold tracking-wider text-emerald-400 uppercase mb-4">Now in Early Access</div>
    <h1 class="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
      Intelligent telemetry for your cloud services.
    </h1>
    <p class="text-neutral-400 text-lg mb-8 max-w-xl mx-auto">
      Continuous monitoring, zero-latency log streaming, and automated health diagnostics built for modern engineering teams.
    </p>
    <div class="flex max-w-md mx-auto gap-2">
      <input type="email" placeholder="name@company.com" class="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm flex-1 focus:outline-none focus:border-neutral-600 text-white" />
      <button class="bg-white text-black font-semibold text-sm px-6 py-3 rounded-lg hover:bg-neutral-200 transition">Request Access</button>
    </div>
  </main>

  <footer class="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
    Pulse Cloud Inc. · Hosted on CMNTY Infrastructure
  </footer>
</body>
</html>`,
      },
    ],
  },
  {
    id: 'vite-react',
    name: 'Vite React Web Application',
    description: 'Interactive React application with state management and dynamic UI components.',
    framework: 'static',
    buildCommand: '',
    installCommand: '',
    outputDirectory: './',
    files: [
      {
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite React Demo — CMNTY</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-neutral-50 text-neutral-900 min-h-screen flex items-center justify-center p-6 antialiased">
  <div id="root" class="w-full max-w-md"></div>
  <script type="text/babel">
    function App() {
      const [count, setCount] = React.useState(0);
      return (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">CMNTY React App</div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 mb-3">Interactive Counter</h1>
          <p className="text-sm text-neutral-600 mb-6">Stateful React application running seamlessly on CMNTY edge hosting.</p>
          <div className="bg-neutral-100 rounded-xl p-6 text-center mb-6">
            <span className="text-4xl font-mono font-bold text-neutral-900">{count}</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setCount(c => c - 1)} 
              className="flex-1 py-2.5 px-4 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 active:scale-95 transition"
            >
              Decrease
            </button>
            <button 
              onClick={() => setCount(c => c + 1)} 
              className="flex-1 py-2.5 px-4 bg-neutral-950 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 active:scale-95 transition"
            >
              Increment
            </button>
          </div>
        </div>
      );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`,
      },
    ],
  },
];
