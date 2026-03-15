import Database from "better-sqlite3";
import path from "path";
import bcryptjs from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "dashboard.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb(db);
  }
  return db;
}

export function auditLog(
  db: Database.Database,
  userId: number,
  userName: string,
  actionType: string,
  details: object,
  targetType?: string,
  targetId?: number
) {
  db.prepare(
    "INSERT INTO audit_log (user_id, user_name, action_type, details, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, userName, actionType, JSON.stringify(details), targetType || null, targetId || null);
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pillar TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_teams (
      user_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, team_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      deliverable TEXT NOT NULL,
      workstream TEXT DEFAULT '',
      status TEXT DEFAULT 'OPEN',
      owner TEXT DEFAULT '',
      timeline TEXT DEFAULT '',
      category TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      priority TEXT DEFAULT 'MEDIUM',
      due_date TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS task_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT,
      notes TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      team_name TEXT NOT NULL,
      team_slug TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS dept_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      depends_on_team_slug TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      UNIQUE(task_id, depends_on_team_slug)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      target_type TEXT,
      target_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add due_date column if missing (for existing DBs)
  try {
    db.prepare("SELECT due_date FROM tasks LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT NULL");
  }

  // Check if teams are already seeded
  const count = db.prepare("SELECT COUNT(*) as cnt FROM teams").get() as { cnt: number };
  if (count.cnt === 0) {
    seedData(db);
  }
}

// Temporary passwords for each user
const USER_PASSWORDS: Record<string, string> = {
  "yufeng": "Wlfi-YuF3ng!24",
  "corey": "Wlfi-C0r3y!24",
  "chaofan": "Wlfi-Ch40f@n!24",
  "hanzhi": "Wlfi-H4nzh1!24",
  "yanju": "Wlfi-Y4nju!24",
  "boga": "Wlfi-B0g4!24",
  "serhan": "Wlfi-S3rh4n!24",
  "buji": "Wlfi-Buj1!24",
  "zak": "Wlfi-Z4k!24",
  "zach": "Wlfi-Z4ch!24",
  "justin": "Wlfi-Just1n!24",
  "jack": "Wlfi-J4ck!24",
  "mello": "Wlfi-M3ll0!24",
  "henry": "Wlfi-H3nry!24",
  "peter": "Wlfi-P3t3r!24",
  "jeff": "Wlfi-J3ff!24",
  "mack": "Wlfi-M4ck!24",
  "brandi": "Wlfi-Br4nd1!24",
  "lorena": "Wlfi-L0r3na!24",
  "ben": "Wlfi-B3n!24",
  "shawn": "Wlfi-Sh4wn!24",
  "chase": "Wlfi-Ch4s3!24",
  "ryan": "Wlfi-Ry4n!24",
};

function seedData(db: Database.Database) {
  const teams = [
    { name: "Leadership", slug: "leadership", password: "wlfi-lead-2026", pillar: "All Pillars", description: "Executive oversight across all pillars" },
    { name: "Engineering", slug: "engineering", password: "wlfi-eng-2026", pillar: "Pillar 1", description: "Agent-Native Technical Infrastructure" },
    { name: "Business Development", slug: "bd", password: "wlfi-bd-2026", pillar: "Pillar 2", description: "BD & Partnership Execution" },
    { name: "DeFi/Exchange", slug: "defi", password: "wlfi-defi-2026", pillar: "Pillar 3", description: "DeFi & Exchange Liquidity" },
    { name: "Legal & Compliance", slug: "legal", password: "wlfi-legal-2026", pillar: "Pillar 4", description: "Legal, Regulatory & Compliance" },
    { name: "Marketing", slug: "marketing", password: "wlfi-mktg-2026", pillar: "Pillar 5", description: "Marketing Execution" },
  ];

  const insertTeam = db.prepare("INSERT INTO teams (name, slug, password_hash, pillar, description) VALUES (?, ?, ?, ?, ?)");
  const teamIds: Record<string, number> = {};
  for (const t of teams) {
    const hash = bcryptjs.hashSync(t.password, 10);
    const result = insertTeam.run(t.name, t.slug, hash, t.pillar, t.description);
    teamIds[t.slug] = result.lastInsertRowid as number;
  }

  // Seed users
  const userTeamMap: { username: string; displayName: string; teams: string[] }[] = [
    { username: "yufeng", displayName: "Yu Feng", teams: ["engineering"] },
    { username: "corey", displayName: "Corey", teams: ["engineering"] },
    { username: "chaofan", displayName: "Chaofan", teams: ["engineering"] },
    { username: "hanzhi", displayName: "Hanzhi", teams: ["engineering"] },
    { username: "yanju", displayName: "Yanju", teams: ["engineering"] },
    { username: "boga", displayName: "Boga", teams: ["engineering"] },
    { username: "serhan", displayName: "Serhan", teams: ["engineering"] },
    { username: "buji", displayName: "Buji", teams: ["engineering"] },
    { username: "zak", displayName: "Zak", teams: ["bd", "leadership"] },
    { username: "zach", displayName: "Zach", teams: ["bd", "leadership"] },
    { username: "justin", displayName: "Justin", teams: ["defi"] },
    { username: "jack", displayName: "Jack", teams: ["defi"] },
    { username: "mello", displayName: "Mello", teams: ["defi"] },
    { username: "henry", displayName: "Henry", teams: ["defi"] },
    { username: "peter", displayName: "Peter", teams: ["defi"] },
    { username: "jeff", displayName: "Jeff", teams: ["defi"] },
    { username: "mack", displayName: "Mack", teams: ["legal"] },
    { username: "brandi", displayName: "Brandi", teams: ["legal"] },
    { username: "lorena", displayName: "Lorena", teams: ["legal"] },
    { username: "ben", displayName: "Ben", teams: ["legal"] },
    { username: "shawn", displayName: "Shawn", teams: ["marketing"] },
    { username: "chase", displayName: "Chase", teams: ["leadership"] },
    { username: "ryan", displayName: "Ryan", teams: ["leadership"] },
  ];

  const insertUser = db.prepare("INSERT INTO users (name, display_name, password_hash, must_change_password) VALUES (?, ?, ?, 1)");
  const insertUserTeam = db.prepare("INSERT INTO user_teams (user_id, team_id) VALUES (?, ?)");

  const seedUsersTransaction = db.transaction(() => {
    for (const u of userTeamMap) {
      const pw = USER_PASSWORDS[u.username] || "Wlfi-Default!24";
      const hash = bcryptjs.hashSync(pw, 10);
      const result = insertUser.run(u.username, u.displayName, hash);
      const userId = result.lastInsertRowid as number;
      for (const teamSlug of u.teams) {
        insertUserTeam.run(userId, teamIds[teamSlug]);
      }
    }
  });
  seedUsersTransaction();

  // Seed tasks
  const insertTask = db.prepare(
    "INSERT INTO tasks (team_id, deliverable, workstream, status, owner, timeline, category, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const seedMany = db.transaction((tasks: any[]) => {
    for (const t of tasks) {
      insertTask.run(t.team_id, t.deliverable, t.workstream, t.status, t.owner, t.timeline, t.category, t.priority, t.due_date || null);
    }
  });

  // Engineering tasks (Pillar 1)
  const engTasks = [
    { deliverable: "SDK + headless wallet live in marketplace & GitHub", workstream: "1.1", status: "IN FLIGHT", owner: "BOGA", timeline: "Immediate", category: "SDK & Agent Skill", priority: "CRITICAL", due_date: "2026-03-10" },
    { deliverable: "npm package published", workstream: "1.1", status: "IN FLIGHT", owner: "HANZHI", timeline: "Immediate", category: "SDK & Agent Skill", priority: "CRITICAL", due_date: "2026-03-08" },
    { deliverable: "Machine-readable chain support registry published", workstream: "1.4", status: "OPEN", owner: "YU FENG", timeline: "At SDK launch", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-03-20" },
    { deliverable: "Bridge coverage documented (contracts + audit status)", workstream: "1.4", status: "OPEN", owner: "BOGA", timeline: "At SDK launch", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-03-20" },
    { deliverable: "EIP-3009 spec finalized and published", workstream: "1.2", status: "IN PROGRESS", owner: "COREY", timeline: "14 days", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-03-12" },
    { deliverable: "EIP-3009 contract modifications complete + test suite", workstream: "1.2", status: "IN PROGRESS", owner: "HANZHI", timeline: "14 days", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-03-12" },
    { deliverable: "EIP-3009 testnet deployed for audit reference", workstream: "1.2", status: "OPEN", owner: "HANZHI", timeline: "21 days", category: "EIP-3009", priority: "HIGH", due_date: "2026-04-05" },
    { deliverable: "Audit firms engaged, scope confirmed, timelines locked", workstream: "1.2", status: "OPEN", owner: "COREY", timeline: "21 days", category: "EIP-3009", priority: "HIGH", due_date: "2026-04-05" },
    { deliverable: "Standards participation owner assigned + bandwidth allocated", workstream: "1.3", status: "IN PROGRESS", owner: "YU FENG", timeline: "Immediate", category: "Standards", priority: "HIGH", due_date: "2026-03-05" },
    { deliverable: "EIP-3009 audit completion — all firms", workstream: "1.2", status: "AUDIT-GATED", owner: "COREY", timeline: "45 days", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-04-30" },
    { deliverable: "EIP-3009 mainnet deployment (ETH + BSC)", workstream: "1.2", status: "AUDIT-GATED", owner: "COREY", timeline: "30 days post-audit", category: "EIP-3009", priority: "CRITICAL" },
    { deliverable: "Gasless support on EVM chains", workstream: "2", status: "OPEN", owner: "CHAOFAN", timeline: "45 days", category: "SDK & Agent Skill", priority: "HIGH", due_date: "2026-04-30" },
    { deliverable: "SDK updated with EIP-3009 methods", workstream: "1.1/1.2", status: "AUDIT-GATED", owner: "CHAOFAN", timeline: "Post-audit", category: "SDK & Agent Skill", priority: "HIGH" },
    { deliverable: "Monad deployment live + in chain registry", workstream: "1.4", status: "OPEN", owner: "YANJU", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-15" },
    { deliverable: "AI Agent Consortium formal membership", workstream: "1.3", status: "OPEN", owner: "YU FENG", timeline: "30 days", category: "Standards", priority: "MEDIUM", due_date: "2026-04-15" },
    { deliverable: "X402 spec reviewed + comment/PR submitted", workstream: "1.3", status: "OPEN", owner: "CHAOFAN", timeline: "30 days", category: "Standards", priority: "MEDIUM", due_date: "2026-04-15" },
    { deliverable: "Audit reports published publicly", workstream: "1.2", status: "AUDIT-GATED", owner: "COREY", timeline: "Post-audit", category: "EIP-3009", priority: "HIGH" },
    { deliverable: "Monad deployment date confirmed", workstream: "1.4", status: "IN FLIGHT", owner: "COREY", timeline: "7 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-03-11" },
    { deliverable: "USD1 Agentic Payment Specification published on GitHub", workstream: "1.3", status: "PLANNED", owner: "YANJU", timeline: "45 days", category: "Standards", priority: "MEDIUM", due_date: "2026-04-30" },
    { deliverable: "WLFI's own ERC-XXXX Agentic Commerce verified + reference test vectors published", workstream: "1.3", status: "PLANNED", owner: "YU FENG", timeline: "60 days", category: "Standards", priority: "MEDIUM", due_date: "2026-05-15" },
    { deliverable: "Base native deployment live", workstream: "1.4", status: "PLANNED", owner: "CHAOFAN", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-15" },
    { deliverable: "Arbitrum native deployment live", workstream: "1.4", status: "PLANNED", owner: "YANJU", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-15" },
    { deliverable: "Agent-only hackathon announced and accepting registrations", workstream: "1.1/1.3", status: "PLANNED", owner: "YU FENG", timeline: "45 days", category: "SDK & Agent Skill", priority: "MEDIUM", due_date: "2026-04-30" },
    { deliverable: "Multi-chain EIP-3009 reference implementation published", workstream: "1.2/1.3", status: "PLANNED", owner: "HANZHI", timeline: "60 days", category: "EIP-3009", priority: "MEDIUM", due_date: "2026-05-15" },
  ].map((t) => ({ ...t, team_id: teamIds["engineering"] }));

  const bdTasks = [
    { deliverable: "G42 correct counterpart identified for compute billing conversation", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "0-14 days", category: "Sovereign AI Integration", priority: "CRITICAL", due_date: "2026-03-07" },
    { deliverable: "G42 compute billing meeting scheduled", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "0-14 days", category: "Sovereign AI Integration", priority: "CRITICAL", due_date: "2026-03-07" },
    { deliverable: "Integration brief prepared (one-page billing flow)", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "Before meeting", category: "Sovereign AI Integration", priority: "HIGH", due_date: "2026-03-14" },
    { deliverable: "Direct relationship protocol documented and assigned", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "Immediate", category: "Direct Relationships", priority: "CRITICAL", due_date: "2026-03-03" },
    { deliverable: "Existing WLFI fintech contacts reactivated in priority corridors", workstream: "2.3", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Geographic Corridors", priority: "HIGH", due_date: "2026-03-14" },
    { deliverable: "G42 compute billing meeting held; integration framework under discussion", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Sovereign AI Integration", priority: "HIGH" },
    { deliverable: "G42 portfolio mapping complete — top 10 AI lab targets identified", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "AI Lab Ecosystem", priority: "HIGH" },
    { deliverable: "Outreach initiated to top 10 AI labs via G42 introductions", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "AI Lab Ecosystem", priority: "HIGH" },
    { deliverable: "Exploratory calls completed with at least 5 AI lab targets", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "AI Lab Ecosystem", priority: "HIGH" },
    { deliverable: "G42 corridor introductions confirmed — UAE-PK, MY-ID, UAE-EG", workstream: "2.3", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Geographic Corridors", priority: "HIGH" },
    { deliverable: "WLFI sovereign white paper published", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "Direct Relationships", priority: "MEDIUM" },
    { deliverable: "First direct (non-G42) meetings held with all introduced partners", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "Ongoing", category: "Direct Relationships", priority: "HIGH" },
    { deliverable: "At least 1 sovereign AI platform has active USD1 integration conversation", workstream: "2.1", status: "PLANNED", owner: "Unassigned", timeline: "60 days", category: "Sovereign AI Integration", priority: "HIGH" },
    { deliverable: "3 signed AI lab partnership agreements", workstream: "2.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "AI Lab Ecosystem", priority: "HIGH" },
    { deliverable: "At least 1 live USD1 transaction on a partner AI lab's platform", workstream: "2.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "AI Lab Ecosystem", priority: "HIGH" },
    { deliverable: "5 live fintech partner agreements across G42 corridors", workstream: "2.3", status: "PLANNED", owner: "Unassigned", timeline: "120 days", category: "Geographic Corridors", priority: "MEDIUM" },
    { deliverable: "First live USD1 cross-border settlement in at least 1 corridor", workstream: "2.3", status: "PLANNED", owner: "Unassigned", timeline: "120 days", category: "Geographic Corridors", priority: "HIGH" },
    { deliverable: "First G42 platform live billing integration deployed", workstream: "2.1", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Sovereign AI Integration", priority: "CRITICAL" },
    { deliverable: "At least 1 sovereign entity in working group or advisory stage", workstream: "2.4", status: "PLANNED", owner: "Unassigned", timeline: "60 days", category: "Direct Relationships", priority: "MEDIUM" },
    { deliverable: "Formal MOU or integration announcement with at least 1 sovereign entity", workstream: "2.4", status: "PLANNED", owner: "Unassigned", timeline: "180 days", category: "Direct Relationships", priority: "MEDIUM" },
  ].map((t) => ({ ...t, team_id: teamIds["bd"] }));

  const defiTasks = [
    { deliverable: "Wintermute relationship meeting scheduled", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "0-7 days", category: "Market Makers", priority: "CRITICAL", due_date: "2026-03-06" },
    { deliverable: "Cumberland relationship meeting scheduled", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "0-7 days", category: "Market Makers", priority: "CRITICAL", due_date: "2026-03-06" },
    { deliverable: "PoR API submitted to Gauntlet + Chaos Labs", workstream: "3.5", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Proof of Reserves", priority: "HIGH", due_date: "2026-03-14" },
    { deliverable: "PoR API DefiLlama integration requested", workstream: "3.5", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Proof of Reserves", priority: "HIGH", due_date: "2026-03-14" },
    { deliverable: "Current status of all CEX conversations documented", workstream: "3.3", status: "OPEN", owner: "Unassigned", timeline: "Immediate", category: "CEX Listings", priority: "HIGH", due_date: "2026-03-01" },
    { deliverable: "Gauntlet pre-assessment contact initiated for Aave + Compound", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "2+ market maker agreements signed", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "Before listing", category: "Market Makers", priority: "CRITICAL" },
    { deliverable: "Aave ARC submitted to governance forum", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "21 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Uniswap USD1/USDC pool seeded — $10M minimum", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Curve pool deployed + gauge proposal submitted", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Compound governance proposal submitted", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "MEDIUM" },
    { deliverable: "Binance + OKX listing terms agreed / timeline locked", workstream: "3.3", status: "REVIEW", owner: "Unassigned", timeline: "30 days", category: "CEX Listings", priority: "CRITICAL" },
    { deliverable: "Coinbase Advanced Trade submission made", workstream: "3.3", status: "REVIEW", owner: "Unassigned", timeline: "30 days", category: "CEX Listings", priority: "HIGH" },
    { deliverable: "Morpho curators engaged — 2+ committed to vault deployment", workstream: "3.2", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "Tier 2 DeFi", priority: "MEDIUM" },
    { deliverable: "Aave listing live — USD1 active as collateral", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Uniswap pool depth $50M+", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Curve gauge weight secured", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "MEDIUM" },
    { deliverable: "Binance and OKX listings live with MM support", workstream: "3.3", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "CEX Listings", priority: "CRITICAL" },
    { deliverable: "Aave TVL $200M+", workstream: "3.1", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Morpho USD1 vault live — $10M+ TVL", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 2 DeFi", priority: "MEDIUM" },
    { deliverable: "Pendle PT/YT market live for yield-bearing USD1", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 2 DeFi", priority: "MEDIUM" },
    { deliverable: "Coinbase Advanced Trade listing live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "HIGH" },
    { deliverable: "Bybit + Kraken listings live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "MEDIUM" },
    { deliverable: "GMX v2 listing live (post-Arbitrum deployment)", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Tier 2 DeFi", priority: "MEDIUM" },
    { deliverable: "Hyperliquid margin/spot support live", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Tier 2 DeFi", priority: "MEDIUM" },
    { deliverable: "USD1 liquidity within 20% of USDC depth on all Tier 1 DeFi protocols", workstream: "3.1", status: "PLANNED", owner: "Unassigned", timeline: "180 days", category: "Tier 1 DeFi", priority: "HIGH" },
    { deliverable: "Binance Earn + OKX Earn USD1 products live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "MEDIUM" },
  ].map((t) => ({ ...t, team_id: teamIds["defi"] }));

  const legalTasks = [
    { deliverable: "OCC application status memo — open items, conditions, supplemental needs", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "OCC Charter", priority: "CRITICAL", due_date: "2026-03-10" },
    { deliverable: "Approved public language for OCC application status confirmed", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "OCC Charter", priority: "CRITICAL", due_date: "2026-03-10" },
    { deliverable: "Toolkit document list confirmed; ownership assigned per document", workstream: "4.6", status: "OPEN", owner: "Unassigned", timeline: "Immediate", category: "Regulatory Toolkit", priority: "HIGH", due_date: "2026-03-05" },
    { deliverable: "Big Four firm outreach initiated — 3 firms approached", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-03-14" },
    { deliverable: "MiCA: EMI member state confirmed; local counsel engaged", workstream: "4.2", status: "REVIEW", owner: "Unassigned", timeline: "14 days", category: "International Licensing", priority: "HIGH" },
    { deliverable: "AML/BSA self-assessment against OCC examination standards initiated", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "OCC Charter", priority: "HIGH" },
    { deliverable: "Big Four attestation engagement terms agreed", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Trust Infrastructure", priority: "HIGH" },
    { deliverable: "GENIUS Act compliance framework — first draft", workstream: "4.3", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "GENIUS Act", priority: "HIGH" },
    { deliverable: "Advisory board legal framework drafted", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Trust Infrastructure", priority: "MEDIUM" },
    { deliverable: "Compliance white paper — first draft by legal team", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "Trust Infrastructure", priority: "HIGH" },
    { deliverable: "GENIUS Act compliance framework published at versioned URL", workstream: "4.3", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "GENIUS Act", priority: "HIGH" },
    { deliverable: "Government relations advisor engaged for legislative engagement", workstream: "4.5", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Legislative Engagement", priority: "MEDIUM" },
    { deliverable: "Post-OCC approval press release template drafted", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "OCC Charter", priority: "MEDIUM" },
    { deliverable: "First Big Four attestation published", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Trust Infrastructure", priority: "HIGH" },
    { deliverable: "Compliance white paper published on WLFI website", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Trust Infrastructure", priority: "HIGH" },
    { deliverable: "Regulatory toolkit v1.0 assembled and deployed to BD teams", workstream: "4.6", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Regulatory Toolkit", priority: "HIGH" },
    { deliverable: "OCC conditional approval received", workstream: "4.1", status: "IN FLIGHT", owner: "Unassigned", timeline: "May 2026", category: "OCC Charter", priority: "CRITICAL" },
    { deliverable: "Post-approval BD + international notifications executed", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "Day of approval", category: "OCC Charter", priority: "HIGH" },
    { deliverable: "ADGM application initiated with UAE counsel", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "30d post-OCC", category: "International Licensing", priority: "HIGH" },
    { deliverable: "MAS MSF application initiated with Singapore counsel", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "30d post-OCC", category: "International Licensing", priority: "HIGH" },
    { deliverable: "FCA cryptoasset registration initiated", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "International Licensing", priority: "MEDIUM" },
    { deliverable: "At least 2 advisory board members recruited and announced", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "90 days", category: "Trust Infrastructure", priority: "MEDIUM" },
    { deliverable: "Congressional staff briefings completed", workstream: "4.5", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Legislative Engagement", priority: "MEDIUM" },
    { deliverable: "Policy paper on agentic payment regulation co-published", workstream: "4.5", status: "OPEN", owner: "Unassigned", timeline: "90 days", category: "Legislative Engagement", priority: "MEDIUM" },
    { deliverable: "Full advisory board (4 seats) announced", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "120 days", category: "Trust Infrastructure", priority: "MEDIUM" },
    { deliverable: "GENIUS Act compliance framework cited by at least 1 external source", workstream: "4.3", status: "OPEN", owner: "Unassigned", timeline: "90 days", category: "GENIUS Act", priority: "LOW" },
  ].map((t) => ({ ...t, team_id: teamIds["legal"] }));

  const mktgTasks = [
    { deliverable: "Finalize Core Narrative Framework and Language Standards", workstream: "5.1", status: "OPEN", owner: "Head of Marketing", timeline: "Days 1-7", category: "Phase 1: Foundation", priority: "CRITICAL" },
    { deliverable: "Publish 'USD1: The Agentic Economy's Financial Primitive' positioning post", workstream: "5.1", status: "OPEN", owner: "Content Lead", timeline: "Day 14", category: "Phase 1: Foundation", priority: "HIGH" },
    { deliverable: "Begin co-authoring Developer Guide with Engineering", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 7", category: "Phase 1: Foundation", priority: "HIGH" },
    { deliverable: "Launch 'Agentic Economy Data' weekly series", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Day 14", category: "Phase 1: Foundation", priority: "HIGH" },
    { deliverable: "Begin hackathon planning — confirm prize pool, judging criteria", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Days 7-14", category: "Phase 1: Foundation", priority: "MEDIUM" },
    { deliverable: "Identify and engage economic research firm for 'Agentic Economy by 2030' study", workstream: "5.4", status: "OPEN", owner: "Head of Marketing", timeline: "Days 14-30", category: "Phase 1: Foundation", priority: "MEDIUM" },
    { deliverable: "Brief top 5 tier-1 media contacts on USD1 growth narrative", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Days 14-30", category: "Phase 1: Foundation", priority: "HIGH" },
    { deliverable: "Begin white paper outline and engage Legal for review process", workstream: "5.4", status: "OPEN", owner: "Content Lead + Legal", timeline: "Day 21", category: "Phase 1: Foundation", priority: "MEDIUM" },
    { deliverable: "Announce hackathon with full details (Eng sandbox must be ready)", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Day 30", category: "Phase 1: Foundation", priority: "HIGH" },
    { deliverable: "Publish 'Building Agentic Businesses with USD1' Developer Guide", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "HIGH" },
    { deliverable: "Publish 'Agent Paymaster' tutorial", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "HIGH" },
    { deliverable: "Run hackathon — active competition period", workstream: "5.3", status: "OPEN", owner: "Events Lead + Eng", timeline: "Days 30-45", category: "Phase 2: Execution", priority: "HIGH" },
    { deliverable: "USD1 Agentic Payment Specification published (Marketing packages)", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM" },
    { deliverable: "Publish hackathon winners + case studies", workstream: "5.3", status: "OPEN", owner: "Content Lead", timeline: "Day 52", category: "Phase 2: Execution", priority: "MEDIUM" },
    { deliverable: "Submit white paper first draft to Legal + Engineering review", workstream: "5.4", status: "OPEN", owner: "Content Lead", timeline: "Day 60", category: "Phase 2: Execution", priority: "HIGH" },
    { deliverable: "Announce Agent Treasury open-source contract (post-audit)", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Day 60", category: "Phase 2: Execution", priority: "MEDIUM" },
    { deliverable: "Speaker submissions filed for Consensus, Token2049, Money 20/20", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM" },
    { deliverable: "USDC growth comparison data story published", workstream: "5.4", status: "OPEN", owner: "Content Lead + Data", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM" },
    { deliverable: "First keynote delivered — Consensus or equivalent", workstream: "5.3", status: "OPEN", owner: "Executive + Mktg", timeline: "Day 60-75", category: "Phase 2: Execution", priority: "HIGH" },
    { deliverable: "Publish WLFI white paper: 'USD1 as Critical Infrastructure for the Agentic Economy'", workstream: "5.4", status: "OPEN", owner: "Content Lead", timeline: "Day 90", category: "Phase 3: Amplification", priority: "HIGH" },
    { deliverable: "Distribute white paper to institutional contact list, sovereign wealth fund relationships", workstream: "5.4", status: "OPEN", owner: "PR + BD Leads", timeline: "Day 90", category: "Phase 3: Amplification", priority: "HIGH" },
    { deliverable: "Economic study published — distribute via press, media, institutional channels", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Day 120", category: "Phase 3: Amplification", priority: "MEDIUM" },
    { deliverable: "Ongoing weekly 'Agentic Economy' series — 12+ editions by Day 180", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Ongoing", category: "Phase 3: Amplification", priority: "MEDIUM" },
    { deliverable: "Press milestone execution for each $500M market cap increment", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Triggered", category: "Phase 3: Amplification", priority: "HIGH" },
    { deliverable: "Developer Guide V2 — updated for new chain deployments + hackathon learnings", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 120", category: "Phase 3: Amplification", priority: "MEDIUM" },
  ].map((t) => ({ ...t, team_id: teamIds["marketing"] }));

  seedMany(engTasks);
  seedMany(bdTasks);
  seedMany(defiTasks);
  seedMany(legalTasks);
  seedMany(mktgTasks);
}
