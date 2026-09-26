import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  User,
  Project,
  Deployment,
  DomainRecord,
  EnvironmentVariable,
  AuditLog,
  SystemConfig,
} from '@/lib/types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  deployments: Deployment[];
  domains: DomainRecord[];
  environmentVariables: EnvironmentVariable[];
  auditLogs: AuditLog[];
  systemConfig: SystemConfig;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'cmnty_db.json');

// Default initial system configuration
const defaultSystemConfig: SystemConfig = {
  vercelToken: process.env.VERCEL_TOKEN || '',
  vercelTeamId: process.env.VERCEL_TEAM_ID || '',
  baseDomain: process.env.BASE_DOMAIN || 'cmnty.biz.id',
  availableDomains: ['cmnty.biz.id'],
  allowPublicRegistration: true,
  maxProjectsPerUser: 3,
  maxDeploymentsPerDay: 50,
};

// Seed initial database state
function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  return {
    users: [],
    projects: [],
    deployments: [],
    domains: [],
    environmentVariables: [],
    auditLogs: [
      {
        id: 'log_init',
        userId: 'system',
        userEmail: 'system@cmnty.local',
        action: 'SYSTEM_BOOT',
        metadata: { version: '1.0.0', platform: 'CMNTY Hosting' },
        createdAt: now,
      },
    ],
    systemConfig: defaultSystemConfig,
  };
}

// Sync admin user configured via .env (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)
function syncEnvAdmin(data: DatabaseSchema): void {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  const envName = process.env.ADMIN_NAME || 'System Admin';

  if (!envEmail || !envPassword) return;

  const existingIdx = data.users.findIndex((u) => u.email.toLowerCase() === envEmail);
  if (existingIdx !== -1) {
    if (data.users[existingIdx].role !== 'admin') {
      data.users[existingIdx].role = 'admin';
    }
  } else {
    data.users.push({
      id: 'usr_env_admin',
      email: envEmail,
      name: envName,
      passwordHash: 'pbkdf2_env_managed',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }
}

// In-memory cache + resilient atomic file persistence
let cachedDb: DatabaseSchema | null = null;
let isFirestoreSynced = false;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Start async Firestore sync on file load to hydrate local cache
async function syncFromFirestore() {
  try {
    const collectionsToFetch = ['users', 'projects', 'deployments', 'domains', 'environmentVariables', 'auditLogs'];
    const newData: any = {
      users: [],
      projects: [],
      deployments: [],
      domains: [],
      environmentVariables: [],
      auditLogs: [],
      systemConfig: defaultSystemConfig,
    };

    for (const collName of collectionsToFetch) {
      const q = collection(firestore, collName);
      const snap = await getDocs(q);
      snap.forEach((doc) => {
        newData[collName].push(doc.data());
      });
    }

    // Fetch systemConfig
    const configSnap = await getDocs(collection(firestore, 'systemConfig'));
    configSnap.forEach((doc) => {
      if (doc.id === 'global') {
        newData.systemConfig = doc.data();
      }
    });

    // Sort appropriately
    newData.deployments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    newData.auditLogs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Only merge/overwrite if we actually retrieved data from Firestore
    if (newData.users.length > 0 || newData.projects.length > 0 || newData.systemConfig.vercelToken) {
      cachedDb = newData;
      syncEnvAdmin(cachedDb!);
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), 'utf-8');
      console.log('[Firestore] Local cache successfully hydrated from cloud Firestore database!');
    } else {
      // If Firestore is empty but we have local file, push local file data to Firestore!
      if (fs.existsSync(DB_FILE)) {
        try {
          const content = fs.readFileSync(DB_FILE, 'utf-8');
          const localData = JSON.parse(content);
          if (localData) {
            console.log('[Firestore] Firestore is empty. Seeding Firestore with local cache...');
            await pushLocalToFirestore(localData);
          }
        } catch (e) {
          console.error('[Firestore] Failed to seed Firestore from local file', e);
        }
      }
    }
    isFirestoreSynced = true;
  } catch (err) {
    console.error('[Firestore] Failed to sync from Firestore on startup:', err);
  }
}

async function pushLocalToFirestore(data: DatabaseSchema) {
  try {
    for (const u of data.users) {
      await setDoc(doc(firestore, 'users', u.id), u);
    }
    for (const p of data.projects) {
      await setDoc(doc(firestore, 'projects', p.id), p);
    }
    for (const d of data.deployments) {
      await setDoc(doc(firestore, 'deployments', d.id), d);
    }
    for (const dom of data.domains) {
      await setDoc(doc(firestore, 'domains', dom.id), dom);
    }
    for (const ev of data.environmentVariables) {
      await setDoc(doc(firestore, 'environmentVariables', ev.id), ev);
    }
    for (const log of data.auditLogs) {
      await setDoc(doc(firestore, 'auditLogs', log.id), log);
    }
    if (data.systemConfig) {
      await setDoc(doc(firestore, 'systemConfig', 'global'), data.systemConfig);
    }
    console.log('[Firestore] Successfully seeded all local tables to cloud Firestore!');
  } catch (err) {
    console.error('[Firestore] Error seeding Firestore:', err);
  }
}

// Trigger Firestore loading immediately
syncFromFirestore();

export function getDb(): DatabaseSchema {
  if (cachedDb) {
    syncEnvAdmin(cachedDb);
    return cachedDb;
  }

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(content);
      if (!cachedDb?.systemConfig) {
        cachedDb!.systemConfig = defaultSystemConfig;
      }
      syncEnvAdmin(cachedDb!);
      return cachedDb!;
    } catch {
      cachedDb = createInitialDatabase();
      syncEnvAdmin(cachedDb);
      saveDb(cachedDb);
      return cachedDb;
    }
  }

  cachedDb = createInitialDatabase();
  syncEnvAdmin(cachedDb);
  saveDb(cachedDb);
  return cachedDb;
}

export function saveDb(data: DatabaseSchema): void {
  cachedDb = data;
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Failed to write db file atomically', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error('Fallback write error', writeErr);
    }
  }
}

// Firestore Async Write Helpers
async function firestoreSetDoc(collectionName: string, docId: string, data: any) {
  try {
    await setDoc(doc(firestore, collectionName, docId), data);
  } catch (err) {
    console.error(`[Firestore Error] Failed to write to Firestore: ${collectionName}/${docId}`, err);
  }
}

async function firestoreDeleteDoc(collectionName: string, docId: string) {
  try {
    await deleteDoc(doc(firestore, collectionName, docId));
  } catch (err) {
    console.error(`[Firestore Error] Failed to delete from Firestore: ${collectionName}/${docId}`, err);
  }
}

// Relational Operations
export const db = {
  // Users
  getUserByEmail(email: string): User | undefined {
    const data = getDb();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById(id: string): User | undefined {
    const data = getDb();
    return data.users.find((u) => u.id === id);
  },

  getAllUsers(): User[] {
    return getDb().users;
  },

  createUser(user: User): User {
    const data = getDb();
    data.users.push(user);
    saveDb(data);
    firestoreSetDoc('users', user.id, user);
    return user;
  },

  updateUser(id: string, updates: Partial<User>): User | null {
    const data = getDb();
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    data.users[idx] = { ...data.users[idx], ...updates };
    saveDb(data);
    firestoreSetDoc('users', id, data.users[idx]);
    return data.users[idx];
  },

  // Projects
  getProjectsByUserId(userId: string): Project[] {
    const data = getDb();
    return data.projects.filter((p) => p.userId === userId);
  },

  getAllProjects(): Project[] {
    return getDb().projects;
  },

  getProjectById(id: string): Project | undefined {
    const data = getDb();
    const cleanId = (id || '').toLowerCase().trim();
    return data.projects.find(
      (p) =>
        p.id === id ||
        p.slug?.toLowerCase() === cleanId ||
        p.vercelProjectId === id ||
        p.subdomain?.toLowerCase() === cleanId
    );
  },

  getProjectBySlug(slug: string): Project | undefined {
    const data = getDb();
    const cleanSlug = (slug || '').toLowerCase().trim();
    return data.projects.find((p) => p.slug.toLowerCase() === cleanSlug);
  },

  createProject(project: Project): Project {
    const data = getDb();
    data.projects.unshift(project);
    saveDb(data);
    firestoreSetDoc('projects', project.id, project);
    return project;
  },

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const data = getDb();
    const cleanId = (id || '').toLowerCase().trim();
    const idx = data.projects.findIndex(
      (p) =>
        p.id === id ||
        p.slug?.toLowerCase() === cleanId ||
        p.vercelProjectId === id ||
        p.subdomain?.toLowerCase() === cleanId
    );
    if (idx === -1) return null;
    data.projects[idx] = { ...data.projects[idx], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    firestoreSetDoc('projects', data.projects[idx].id, data.projects[idx]);
    return data.projects[idx];
  },

  deleteProject(id: string): boolean {
    const data = getDb();
    const cleanId = (id || '').toLowerCase().trim();
    const target = data.projects.find(
      (p) =>
        p.id === id ||
        p.slug?.toLowerCase() === cleanId ||
        p.vercelProjectId === id ||
        p.subdomain?.toLowerCase() === cleanId
    );
    if (!target) return false;
    const targetId = target.id;

    // Delete in Firestore
    firestoreDeleteDoc('projects', targetId);

    // Cascade delete associated records in Firestore
    const deploymentsToDelete = data.deployments.filter((d) => d.projectId === targetId || d.projectId === id);
    for (const d of deploymentsToDelete) {
      firestoreDeleteDoc('deployments', d.id);
    }
    const domainsToDelete = data.domains.filter((d) => d.projectId === targetId || d.projectId === id);
    for (const dom of domainsToDelete) {
      firestoreDeleteDoc('domains', dom.id);
    }
    const envsToDelete = data.environmentVariables.filter((e) => e.projectId === targetId || e.projectId === id);
    for (const e of envsToDelete) {
      firestoreDeleteDoc('environmentVariables', e.id);
    }

    // Update Local Cache
    data.projects = data.projects.filter(
      (p) =>
        p.id !== targetId &&
        p.id !== id &&
        p.slug?.toLowerCase() !== cleanId &&
        p.vercelProjectId !== id
    );

    // Cascade delete locally
    data.deployments = data.deployments.filter((d) => d.projectId !== targetId && d.projectId !== id);
    data.domains = data.domains.filter((d) => d.projectId !== targetId && d.projectId !== id);
    data.environmentVariables = data.environmentVariables.filter((e) => e.projectId !== targetId && e.projectId !== id);
    saveDb(data);
    return true;
  },

  // Deployments
  getDeploymentsByProjectId(projectId: string): Deployment[] {
    return getDb()
      .deployments.filter((d) => d.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAllDeployments(): Deployment[] {
    return getDb().deployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getDeploymentById(id: string): Deployment | undefined {
    return getDb().deployments.find((d) => d.id === id);
  },

  createDeployment(deployment: Deployment): Deployment {
    const data = getDb();
    data.deployments.unshift(deployment);
    // Update project current deployment
    const pIdx = data.projects.findIndex((p) => p.id === deployment.projectId);
    if (pIdx !== -1) {
      data.projects[pIdx].currentDeploymentId = deployment.id;
      data.projects[pIdx].updatedAt = new Date().toISOString();
      firestoreSetDoc('projects', data.projects[pIdx].id, data.projects[pIdx]);
    }
    saveDb(data);
    firestoreSetDoc('deployments', deployment.id, deployment);
    return deployment;
  },

  updateDeployment(id: string, updates: Partial<Deployment>): Deployment | null {
    const data = getDb();
    const idx = data.deployments.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    data.deployments[idx] = { ...data.deployments[idx], ...updates };
    saveDb(data);
    firestoreSetDoc('deployments', id, data.deployments[idx]);
    return data.deployments[idx];
  },

  appendDeploymentLog(id: string, logLine: string): void {
    const data = getDb();
    const idx = data.deployments.findIndex((d) => d.id === id);
    if (idx !== -1) {
      if (!data.deployments[idx].logs) data.deployments[idx].logs = [];
      data.deployments[idx].logs.push(logLine);
      saveDb(data);
      firestoreSetDoc('deployments', id, data.deployments[idx]);
    }
  },

  // Domains
  getDomainsByProjectId(projectId: string): DomainRecord[] {
    return getDb().domains.filter((d) => d.projectId === projectId);
  },

  getDomainsByUserId(userId: string): DomainRecord[] {
    return getDb().domains.filter((d) => d.userId === userId);
  },

  getAllDomains(): DomainRecord[] {
    return getDb().domains;
  },

  getDomainByName(domain: string): DomainRecord | undefined {
    return getDb().domains.find((d) => d.domain.toLowerCase() === domain.toLowerCase());
  },

  createDomain(domainRecord: DomainRecord): DomainRecord {
    const data = getDb();
    data.domains.push(domainRecord);
    saveDb(data);
    firestoreSetDoc('domains', domainRecord.id, domainRecord);
    return domainRecord;
  },

  updateDomain(id: string, updates: Partial<DomainRecord>): DomainRecord | null {
    const data = getDb();
    const idx = data.domains.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    data.domains[idx] = { ...data.domains[idx], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    firestoreSetDoc('domains', id, data.domains[idx]);
    return data.domains[idx];
  },

  deleteDomain(id: string): boolean {
    const data = getDb();
    const initLen = data.domains.length;
    data.domains = data.domains.filter((d) => d.id !== id);
    saveDb(data);
    firestoreDeleteDoc('domains', id);
    return data.domains.length < initLen;
  },

  // Environment Variables
  getEnvVarsByProjectId(projectId: string): EnvironmentVariable[] {
    return getDb().environmentVariables.filter((e) => e.projectId === projectId);
  },

  setEnvVar(envVar: EnvironmentVariable): EnvironmentVariable {
    const data = getDb();
    const existingIdx = data.environmentVariables.findIndex(
      (e) => e.projectId === envVar.projectId && e.key === envVar.key
    );
    if (existingIdx !== -1) {
      data.environmentVariables[existingIdx] = envVar;
    } else {
      data.environmentVariables.push(envVar);
    }
    saveDb(data);
    firestoreSetDoc('environmentVariables', envVar.id, envVar);
    return envVar;
  },

  deleteEnvVar(projectId: string, key: string): boolean {
    const data = getDb();
    const target = data.environmentVariables.find((e) => e.projectId === projectId && e.key === key);
    const initLen = data.environmentVariables.length;
    data.environmentVariables = data.environmentVariables.filter(
      (e) => !(e.projectId === projectId && e.key === key)
    );
    saveDb(data);
    if (target) {
      firestoreDeleteDoc('environmentVariables', target.id);
    }
    return data.environmentVariables.length < initLen;
  },

  // Audit Logs
  addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const data = getDb();
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    data.auditLogs.unshift(newLog);
    if (data.auditLogs.length > 500) {
      const oldLogs = data.auditLogs.slice(500);
      for (const ol of oldLogs) {
        firestoreDeleteDoc('auditLogs', ol.id);
      }
      data.auditLogs = data.auditLogs.slice(0, 500);
    }
    saveDb(data);
    firestoreSetDoc('auditLogs', newLog.id, newLog);
    return newLog;
  },

  getAuditLogs(limit = 50): AuditLog[] {
    return getDb().auditLogs.slice(0, limit);
  },

  // System Configuration
  getSystemConfig(): SystemConfig {
    const data = getDb();
    const activeBaseDomain = process.env.BASE_DOMAIN || data.systemConfig.baseDomain || 'cmnty.biz.id';
    const domains = Array.isArray(data.systemConfig.availableDomains) && data.systemConfig.availableDomains.length > 0
      ? data.systemConfig.availableDomains
      : [activeBaseDomain];

    if (!domains.includes(activeBaseDomain)) {
      domains.unshift(activeBaseDomain);
    }

    return {
      vercelToken: process.env.VERCEL_TOKEN || data.systemConfig.vercelToken || '',
      vercelTeamId: process.env.VERCEL_TEAM_ID || data.systemConfig.vercelTeamId || '',
      baseDomain: activeBaseDomain,
      availableDomains: domains,
      allowPublicRegistration: data.systemConfig.allowPublicRegistration ?? true,
      maxProjectsPerUser: data.systemConfig.maxProjectsPerUser ?? 10,
      maxDeploymentsPerDay: data.systemConfig.maxDeploymentsPerDay ?? 50,
    };
  },

  updateSystemConfig(updates: Partial<SystemConfig>): SystemConfig {
    const data = getDb();
    data.systemConfig = { ...data.systemConfig, ...updates };
    saveDb(data);
    firestoreSetDoc('systemConfig', 'global', data.systemConfig);
    return data.systemConfig;
  },

  // Clear or Seed Database Async
  async clearAllCollections() {
    try {
      const collectionsToDelete = ['users', 'projects', 'deployments', 'domains', 'environmentVariables', 'auditLogs'];
      for (const coll of collectionsToDelete) {
        const snap = await getDocs(collection(firestore, coll));
        for (const docItem of snap.docs) {
          await deleteDoc(doc(firestore, coll, docItem.id));
        }
      }
      await deleteDoc(doc(firestore, 'systemConfig', 'global'));
      console.log('[Firestore] All Firestore collections cleared successfully.');
    } catch (err) {
      console.error('[Firestore] Error clearing Firestore database:', err);
    }
  },

  async resetDatabaseAndSync(preservedUsers: User[], resetLog: AuditLog) {
    const data = getDb();
    data.projects = [];
    data.deployments = [];
    data.domains = [];
    data.environmentVariables = [];
    data.users = preservedUsers;
    data.auditLogs = [resetLog];
    saveDb(data);

    // Sync to Firestore
    await this.clearAllCollections();
    for (const u of preservedUsers) {
      await setDoc(doc(firestore, 'users', u.id), u);
    }
    await setDoc(doc(firestore, 'auditLogs', resetLog.id), resetLog);
    if (data.systemConfig) {
      await setDoc(doc(firestore, 'systemConfig', 'global'), data.systemConfig);
    }
  }
};
