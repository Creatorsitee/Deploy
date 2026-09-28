# CMNTY Deploy — High-Performance Cloud Edge Deployment Platform

> **Free Deploy. Simple instant deployment. Fully white-labeled developer ecosystem.**  
> A modern, white-labeled, automated web Deploy and serverless deployment platform. Offers instant ZIP and template-based deployments, automated custom subdomains (`*.cmnty.biz.id`), automated environment variable detection, SSL certificates, resource quotas, and an intuitive Admin Panel.

---

## 🚀 Key Features

- **Zero-Config Deployments**: Drag-and-drop HTML, React, Vite, or Next.js ZIP archives or choose from ready-to-use template starters.
- **Automated Subdomains**: Every project receives an instant live subdomain (e.g., `project-name.cmnty.biz.id`) with automated routing.
- **⚡ Auto-Detect Environment Variables**: Automatically inspects `.env`, `.env.example`, `.env.sample`, `.env.local.example`, and scans source code files inside uploaded project ZIPs to extract environment variables and default values in real time.
- **Fully White-Labeled**: Completely independent branding across all user-facing pages, dashboards, and build inspector logs.
- **Fair-Use Quotas**:
  - **Active Projects**: Limited to max **3 projects** per standard user account.
  - **Daily Deployments**: Limited to max **10 builds** per day.
- **Reserved Subdomain Protection**: Automatically blocks system-critical keywords from being registered as project subdomains (e.g., `api`, `apis`, `admin`, `panel`, `dashboard`, `login`, `register`, `portal`, `www`, `mail`, `dns`, `server`, etc.).
- **Complete Admin Panel**: Manage platform users, inspect registered projects, monitor root domains, configure security credentials, and view system logs.

---

## ⚙️ Environment Variables (`.env`)

The platform is configured via environment variables. To set up your local development environment or production server, copy `.env.example` to `.env` or `.env.local`:

```bash
cp .env.example .env
```

### Supported Environment Variables (Admin Credentials)

| Variable Name | Description | Default / Example Value |
|:---|:---|:---|
| `ADMIN_NAME` | The display name for the primary administrator account. | `"System Admin"` |
| `ADMIN_EMAIL` | The email address used to log into the Admin Panel. | `"admin@example.com"` |
| `ADMIN_PASSWORD` | The secure password for the primary administrator account. | `"MySuperSecretAdminPassword123!"` |

---

## 📦 Installation & Local Development

1. **Clone or Open the Repository**:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Make sure `.env` is populated with your desired admin email, password, and name.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Production Build & Deployment

To build the application for high-performance production use:

```bash
npm run build
npm run start
```

---

## 🛠️ Admin Panel Management

Log into the platform using the administrator credentials defined in your `.env` file (`ADMIN_EMAIL` and `ADMIN_PASSWORD`). 

From the **Admin Panel** (`/admin`), administrators can:
- View total registered users and manage account statuses or roles.
- Inspect all deployed projects across the platform.
- Configure root domains and allowed domains for user deployments.
- View system audit logs and diagnostic health checks.

---

## 🌐 DNS Setup for Base Domain

To enable automatic wildcard subdomains and direct apex routing, configure your DNS registrar records as follows:

| Type | Host / Name | Target / Value | Purpose |
|:---|:---|:---|:---|
| **CNAME** | `*.cmnty.biz.id` | `cname.vercel-dns.com` | Wildcard routing for all user subdomains. |
| **A** | `cmnty.biz.id` | `76.76.21.21` | Apex record for root domain and landing page. |
