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
      created_by_leadership INTEGER DEFAULT 0,
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

  // Migration: add created_by_leadership column if missing
  try {
    db.prepare("SELECT created_by_leadership FROM tasks LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE tasks ADD COLUMN created_by_leadership INTEGER DEFAULT 0");
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
    "INSERT INTO tasks (team_id, deliverable, workstream, status, owner, timeline, category, priority, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const seedMany = db.transaction((tasks: any[]) => {
    for (const t of tasks) {
      insertTask.run(t.team_id, t.deliverable, t.workstream, t.status, t.owner, t.timeline, t.category, t.priority, t.due_date || null, t.notes || "");
    }
  });

  // Engineering tasks (Pillar 1) — updated from V2 roadmap
  const engTasks = [
    // Now — 0 to 14 Days
    { deliverable: "SDK + headless wallet live in marketplace & GitHub", workstream: "1.1", status: "IN FLIGHT", owner: "Boga", timeline: "Tomorrow", category: "SDK & Agent Skill", priority: "CRITICAL", due_date: "2026-03-21" },
    { deliverable: "npm package published", workstream: "1.1", status: "IN FLIGHT", owner: "Hanzhi", timeline: "Tomorrow", category: "SDK & Agent Skill", priority: "CRITICAL", due_date: "2026-03-21" },
    { deliverable: "Machine-readable chain support registry published", workstream: "1.4", status: "OPEN", owner: "Yu Feng", timeline: "≤2 weeks", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Bridge coverage documented (contracts + audit status)", workstream: "1.4", status: "OPEN", owner: "Boga", timeline: "≤2 weeks", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "EIP-3009 spec finalized and published", workstream: "1.2", status: "IN PROGRESS", owner: "Corey", timeline: "≤1 week", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-03-27" },
    { deliverable: "EIP-3009 contract modifications complete + test suite", workstream: "1.2", status: "IN PROGRESS", owner: "Hanzhi", timeline: "≤1 week", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-03-27" },
    { deliverable: "EIP-3009 testnet deployed for audit reference", workstream: "1.2", status: "OPEN", owner: "Hanzhi", timeline: "≤10 days", category: "EIP-3009", priority: "HIGH", due_date: "2026-03-30" },
    { deliverable: "Audit firms engaged, scope confirmed, timelines locked", workstream: "1.2", status: "OPEN", owner: "Corey", timeline: "≤2 weeks", category: "EIP-3009", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Standards participation owner assigned + bandwidth allocated", workstream: "1.3", status: "IN PROGRESS", owner: "Yu Feng", timeline: "Immediate", category: "Standards", priority: "HIGH", due_date: "2026-03-20" },
    // Next — 14 to 30 Days
    { deliverable: "EIP-3009 audit completion — all firms", workstream: "1.2", status: "AUDIT-GATED", owner: "Corey", timeline: "≤30 days", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-04-19" },
    { deliverable: "EIP-3009 mainnet deployment (ETH + BSC)", workstream: "1.2", status: "AUDIT-GATED", owner: "Corey", timeline: "≤30 days", category: "EIP-3009", priority: "CRITICAL", due_date: "2026-04-19" },
    { deliverable: "Gasless support on EVM chains", workstream: "2", status: "OPEN", owner: "Chaofan", timeline: "≤15 days", category: "SDK & Agent Skill", priority: "HIGH", due_date: "2026-04-04" },
    { deliverable: "SDK updated with EIP-3009 methods", workstream: "1.1/1.2", status: "AUDIT-GATED", owner: "Chaofan", timeline: "≤30 days", category: "SDK & Agent Skill", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Monad deployment live + in chain registry", workstream: "1.4", status: "OPEN", owner: "Yanju", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "AI Agent Consortium formal membership", workstream: "1.3", status: "OPEN", owner: "Yu Feng", timeline: "30 days", category: "Standards", priority: "MEDIUM", due_date: "2026-04-19" },
    { deliverable: "X402 spec reviewed + comment/PR submitted", workstream: "1.3", status: "OPEN", owner: "Chaofan", timeline: "30 days", category: "Standards", priority: "MEDIUM", due_date: "2026-04-19" },
    { deliverable: "Audit reports published publicly", workstream: "1.2", status: "AUDIT-GATED", owner: "Corey", timeline: "≤30 days", category: "EIP-3009", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Monad deployment date confirmed", workstream: "1.4", status: "IN FLIGHT", owner: "Corey", timeline: "≤2 weeks", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-03" },
    // Later — 30 to 60 Days
    { deliverable: "USD1 Agentic Payment Specification published on GitHub", workstream: "1.3", status: "PLANNED", owner: "Yanju", timeline: "45 days", category: "Standards", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "WLFI's own ERC-XXXX Agentic Commerce verified + reference test vectors published", workstream: "1.3", status: "PLANNED", owner: "Yu Feng", timeline: "60 days", category: "Standards", priority: "MEDIUM", due_date: "2026-05-19" },
    { deliverable: "Base native deployment live", workstream: "1.4", status: "PLANNED", owner: "Chaofan", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Arbitrum native deployment live", workstream: "1.4", status: "PLANNED", owner: "Yanju", timeline: "30 days", category: "Cross-chain Liquidity", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Agent-only hackathon announced and accepting registrations", workstream: "1.1/1.3", status: "PLANNED", owner: "Yu Feng", timeline: "45 days", category: "SDK & Agent Skill", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "Multi-chain EIP-3009 reference implementation published", workstream: "1.2/1.3", status: "PLANNED", owner: "Hanzhi", timeline: "60 days", category: "EIP-3009", priority: "MEDIUM", due_date: "2026-05-19" },
  ].map((t) => ({ ...t, team_id: teamIds["engineering"] }));

  // BD tasks (Pillar 2) — updated from BD Execution Roadmap
  const bdTasks = [
    // Now — 0 to 14 Days
    { deliverable: "G42 correct counterpart identified for compute billing conversation", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "0-14 days", category: "Sovereign AI Integration", priority: "CRITICAL", due_date: "2026-04-03" },
    { deliverable: "G42 compute billing meeting scheduled", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "0-14 days", category: "Sovereign AI Integration", priority: "CRITICAL", due_date: "2026-04-03" },
    { deliverable: "Integration brief prepared (one-page billing flow)", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "Before meeting", category: "Sovereign AI Integration", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Direct relationship protocol documented and assigned", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "Immediate", category: "Direct Relationships", priority: "CRITICAL", due_date: "2026-03-20" },
    { deliverable: "Existing WLFI fintech contacts reactivated in priority corridors", workstream: "2.3", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Geographic Corridors", priority: "HIGH", due_date: "2026-04-03" },
    // Next — 14 to 45 Days
    { deliverable: "G42 compute billing meeting held; integration framework under discussion", workstream: "2.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Sovereign AI Integration", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "G42 portfolio mapping complete — top 10 AI lab targets identified", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "AI Lab Ecosystem", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Outreach initiated to top 10 AI labs via G42 introductions", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "AI Lab Ecosystem", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Exploratory calls completed with at least 5 AI lab targets", workstream: "2.2", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "AI Lab Ecosystem", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "G42 corridor introductions confirmed — UAE-PK, MY-ID, UAE-EG", workstream: "2.3", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Geographic Corridors", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "WLFI sovereign white paper published", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "Direct Relationships", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "First direct (non-G42) meetings held with all introduced partners", workstream: "2.4", status: "OPEN", owner: "Unassigned", timeline: "Ongoing", category: "Direct Relationships", priority: "HIGH" },
    // Later — 45 to 180 Days
    { deliverable: "At least 1 sovereign AI platform has active USD1 integration conversation", workstream: "2.1", status: "PLANNED", owner: "Unassigned", timeline: "60 days", category: "Sovereign AI Integration", priority: "HIGH", due_date: "2026-05-19" },
    { deliverable: "3 signed AI lab partnership agreements", workstream: "2.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "AI Lab Ecosystem", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "At least 1 live USD1 transaction on a partner AI lab's platform", workstream: "2.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "AI Lab Ecosystem", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "5 live fintech partner agreements across G42 corridors", workstream: "2.3", status: "PLANNED", owner: "Unassigned", timeline: "120 days", category: "Geographic Corridors", priority: "MEDIUM", due_date: "2026-07-18" },
    { deliverable: "First live USD1 cross-border settlement in at least 1 corridor", workstream: "2.3", status: "PLANNED", owner: "Unassigned", timeline: "120 days", category: "Geographic Corridors", priority: "HIGH", due_date: "2026-07-18" },
    { deliverable: "First G42 platform live billing integration deployed", workstream: "2.1", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Sovereign AI Integration", priority: "CRITICAL", due_date: "2026-07-18" },
    { deliverable: "At least 1 sovereign entity in working group or advisory stage", workstream: "2.4", status: "PLANNED", owner: "Unassigned", timeline: "60 days", category: "Direct Relationships", priority: "MEDIUM", due_date: "2026-05-19" },
    { deliverable: "Formal MOU or integration announcement with at least 1 sovereign entity", workstream: "2.4", status: "PLANNED", owner: "Unassigned", timeline: "180 days", category: "Direct Relationships", priority: "MEDIUM", due_date: "2026-09-16" },
  ].map((t) => ({ ...t, team_id: teamIds["bd"] }));

  // DeFi/Exchange tasks (Pillar 3) — updated from DeFi Exchange Roadmap
  const defiTasks = [
    // Now — 0 to 14 Days
    { deliverable: "Wintermute relationship meeting scheduled", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "0-7 days", category: "Market Makers", priority: "CRITICAL", due_date: "2026-03-27" },
    { deliverable: "Cumberland relationship meeting scheduled", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "0-7 days", category: "Market Makers", priority: "CRITICAL", due_date: "2026-03-27" },
    { deliverable: "PoR API submitted to Gauntlet + Chaos Labs", workstream: "3.5", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Proof of Reserves", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "PoR API DefiLlama integration requested", workstream: "3.5", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Proof of Reserves", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Current status of all CEX conversations documented", workstream: "3.3", status: "OPEN", owner: "Unassigned", timeline: "Immediate", category: "CEX Listings", priority: "HIGH", due_date: "2026-03-20" },
    { deliverable: "Gauntlet pre-assessment contact initiated for Aave + Compound", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "14 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-04-03" },
    // Next — 14 to 60 Days
    { deliverable: "2+ market maker agreements signed", workstream: "3.4", status: "OPEN", owner: "Unassigned", timeline: "Before listing", category: "Market Makers", priority: "CRITICAL" },
    { deliverable: "Aave ARC submitted to governance forum", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "21 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-04-10" },
    { deliverable: "Uniswap USD1/USDC pool seeded — $10M minimum", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Curve pool deployed + gauge proposal submitted", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Compound governance proposal submitted", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "30 days", category: "Tier 1 DeFi", priority: "MEDIUM", due_date: "2026-04-19" },
    { deliverable: "Binance + OKX listing terms agreed / timeline locked", workstream: "3.3", status: "REVIEW", owner: "Unassigned", timeline: "30 days", category: "CEX Listings", priority: "CRITICAL", due_date: "2026-04-19" },
    { deliverable: "Coinbase Advanced Trade submission made", workstream: "3.3", status: "REVIEW", owner: "Unassigned", timeline: "30 days", category: "CEX Listings", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Morpho curators engaged — 2+ committed to vault deployment", workstream: "3.2", status: "OPEN", owner: "Unassigned", timeline: "45 days", category: "Tier 2 DeFi", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "Aave listing live — USD1 active as collateral", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-05-19" },
    { deliverable: "Uniswap pool depth $50M+", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-05-19" },
    { deliverable: "Curve gauge weight secured", workstream: "3.1", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "Tier 1 DeFi", priority: "MEDIUM", due_date: "2026-05-19" },
    { deliverable: "Binance and OKX listings live with MM support", workstream: "3.3", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "CEX Listings", priority: "CRITICAL", due_date: "2026-05-19" },
    // Later — 60 to 180 Days
    { deliverable: "Aave TVL $200M+", workstream: "3.1", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "Morpho USD1 vault live — $10M+ TVL", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 2 DeFi", priority: "MEDIUM", due_date: "2026-06-18" },
    { deliverable: "Pendle PT/YT market live for yield-bearing USD1", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "Tier 2 DeFi", priority: "MEDIUM", due_date: "2026-06-18" },
    { deliverable: "Coinbase Advanced Trade listing live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "Bybit + Kraken listings live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "MEDIUM", due_date: "2026-06-18" },
    { deliverable: "GMX v2 listing live (post-Arbitrum deployment)", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Tier 2 DeFi", priority: "MEDIUM", due_date: "2026-07-18" },
    { deliverable: "Hyperliquid margin/spot support live", workstream: "3.2", status: "PLANNED", owner: "Unassigned", timeline: "90-120 days", category: "Tier 2 DeFi", priority: "MEDIUM", due_date: "2026-07-18" },
    { deliverable: "USD1 liquidity within 20% of USDC depth on all Tier 1 DeFi protocols", workstream: "3.1", status: "PLANNED", owner: "Unassigned", timeline: "180 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-09-16" },
    { deliverable: "Uniswap pool depth $150M+", workstream: "3.1", status: "PLANNED", owner: "Unassigned", timeline: "180 days", category: "Tier 1 DeFi", priority: "HIGH", due_date: "2026-09-16" },
    { deliverable: "Binance Earn + OKX Earn USD1 products live", workstream: "3.3", status: "PLANNED", owner: "Unassigned", timeline: "90 days", category: "CEX Listings", priority: "MEDIUM", due_date: "2026-06-18" },
  ].map((t) => ({ ...t, team_id: teamIds["defi"] }));

  // Legal & Compliance tasks (Pillar 4) — updated from Legal Compliance Roadmap V2 (03.12.2026)
  const legalTasks = [
    // 0 to 30 Days
    { deliverable: "OCC application status memo — open items, conditions, supplemental needs", workstream: "4.1", status: "OPEN", owner: "Mack", timeline: "0-30 days", category: "OCC Charter", priority: "CRITICAL", due_date: "2026-04-19", notes: "Paul Hastings dependency" },
    { deliverable: "Approved public language for OCC application status confirmed", workstream: "4.1", status: "COMPLETED", owner: "Mack", timeline: "0-30 days", category: "OCC Charter", priority: "CRITICAL", due_date: "2026-03-20", notes: "Language provided by Paul Hastings" },
    { deliverable: "Independent Audit Firm outreach initiated — 3 firms approached with RFP", workstream: "4.4", status: "OPEN", owner: "Mack", timeline: "0-30 days", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "MiCA: EMI member state confirmed; local counsel engaged", workstream: "4.2", status: "OPEN", owner: "Mack", timeline: "0-30 days", category: "International Licensing", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "BSA/AML independent pre-operational audit — firms approached with RFP", workstream: "4.1", status: "OPEN", owner: "Brandi", timeline: "0-30 days", category: "OCC Charter", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Government relations advisor engaged for legislative engagement", workstream: "4.5", status: "OPEN", owner: "Brandi", timeline: "0-30 days", category: "Legislative Engagement", priority: "MEDIUM", due_date: "2026-04-19", notes: "Current members of Digital Chamber" },
    // 30+ Days / Pending Conditional Approval
    { deliverable: "OCC conditional approval received", workstream: "4.1", status: "IN FLIGHT", owner: "Mack", timeline: "May 2026", category: "OCC Charter", priority: "CRITICAL", due_date: "2026-05-15" },
    { deliverable: "Post-OCC conditional approval press release template drafted", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "30+ days", category: "OCC Charter", priority: "MEDIUM", due_date: "2026-04-30" },
    { deliverable: "BSA/AML independent pre-operational audit against OCC examination standards initiated", workstream: "4.1", status: "OPEN", owner: "Brandi", timeline: "30+ days", category: "OCC Charter", priority: "HIGH", due_date: "2026-05-04" },
    { deliverable: "Independent attestation engagement terms agreed", workstream: "4.4", status: "OPEN", owner: "Mack", timeline: "30+ days", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-05-04" },
    { deliverable: "Congressional staff briefings completed", workstream: "4.5", status: "OPEN", owner: "Unassigned", timeline: "30+ days", category: "Legislative Engagement", priority: "MEDIUM", due_date: "2026-05-19" },
    { deliverable: "Toolkit document list confirmed; ownership assigned per document", workstream: "4.6", status: "OPEN", owner: "Unassigned", timeline: "30+ days", category: "Regulatory Toolkit", priority: "HIGH", due_date: "2026-04-30" },
    // Full OCC Approval
    { deliverable: "Post-approval BD + international notifications executed", workstream: "4.1", status: "OPEN", owner: "Unassigned", timeline: "Day of approval", category: "OCC Charter", priority: "HIGH", due_date: "2026-05-15" },
    { deliverable: "MiCA: EMI application submitted (Latvia via Sorainen)", workstream: "4.2", status: "REVIEW", owner: "Mack", timeline: "Post-OCC", category: "International Licensing", priority: "HIGH", due_date: "2026-06-15" },
    { deliverable: "ADGM application initiated with UAE counsel", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "30d post-OCC", category: "International Licensing", priority: "HIGH", due_date: "2026-06-15" },
    { deliverable: "MAS MSF application initiated with Singapore counsel", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "30d post-OCC", category: "International Licensing", priority: "HIGH", due_date: "2026-06-15" },
    { deliverable: "FCA cryptoasset registration initiated", workstream: "4.2", status: "OPEN", owner: "Unassigned", timeline: "60 days", category: "International Licensing", priority: "MEDIUM", due_date: "2026-07-15" },
    { deliverable: "GENIUS Act compliance framework published at versioned URL", workstream: "4.3", status: "OPEN", owner: "Unassigned", timeline: "Post-OCC", category: "GENIUS Act", priority: "HIGH", due_date: "2026-06-15" },
    { deliverable: "GENIUS Act compliance framework — first draft", workstream: "4.3", status: "OPEN", owner: "Unassigned", timeline: "Post-OCC", category: "GENIUS Act", priority: "HIGH", due_date: "2026-05-30" },
    { deliverable: "Compliance white paper — first draft by legal team", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "Post-OCC", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-06-15" },
    { deliverable: "Independent attestation published", workstream: "4.4", status: "OPEN", owner: "Mack", timeline: "Post-OCC", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-06-30" },
    { deliverable: "Compliance white paper published on WLFI website", workstream: "4.4", status: "OPEN", owner: "Unassigned", timeline: "Post-OCC", category: "Trust Infrastructure", priority: "HIGH", due_date: "2026-07-15" },
    { deliverable: "Policy paper on agentic payment regulation co-published", workstream: "4.5", status: "OPEN", owner: "Unassigned", timeline: "90 days", category: "Legislative Engagement", priority: "MEDIUM", due_date: "2026-06-18" },
    { deliverable: "Regulatory toolkit v1.0 assembled and deployed to BD teams", workstream: "4.6", status: "OPEN", owner: "Unassigned", timeline: "Post-OCC", category: "Regulatory Toolkit", priority: "HIGH", due_date: "2026-07-15" },
  ].map((t) => ({ ...t, team_id: teamIds["legal"] }));

  // Marketing tasks (Pillar 5) — no updated doc, keeping existing
  const mktgTasks = [
    { deliverable: "Finalize Core Narrative Framework and Language Standards", workstream: "5.1", status: "OPEN", owner: "Head of Marketing", timeline: "Days 1-7", category: "Phase 1: Foundation", priority: "CRITICAL", due_date: "2026-03-27" },
    { deliverable: "Publish 'USD1: The Agentic Economy's Financial Primitive' positioning post", workstream: "5.1", status: "OPEN", owner: "Content Lead", timeline: "Day 14", category: "Phase 1: Foundation", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Begin co-authoring Developer Guide with Engineering", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 7", category: "Phase 1: Foundation", priority: "HIGH", due_date: "2026-03-27" },
    { deliverable: "Launch 'Agentic Economy Data' weekly series", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Day 14", category: "Phase 1: Foundation", priority: "HIGH", due_date: "2026-04-03" },
    { deliverable: "Begin hackathon planning — confirm prize pool, judging criteria", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Days 7-14", category: "Phase 1: Foundation", priority: "MEDIUM", due_date: "2026-04-03" },
    { deliverable: "Identify and engage economic research firm for 'Agentic Economy by 2030' study", workstream: "5.4", status: "OPEN", owner: "Head of Marketing", timeline: "Days 14-30", category: "Phase 1: Foundation", priority: "MEDIUM", due_date: "2026-04-19" },
    { deliverable: "Brief top 5 tier-1 media contacts on USD1 growth narrative", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Days 14-30", category: "Phase 1: Foundation", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Begin white paper outline and engage Legal for review process", workstream: "5.4", status: "OPEN", owner: "Content Lead + Legal", timeline: "Day 21", category: "Phase 1: Foundation", priority: "MEDIUM", due_date: "2026-04-10" },
    { deliverable: "Announce hackathon with full details (Eng sandbox must be ready)", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Day 30", category: "Phase 1: Foundation", priority: "HIGH", due_date: "2026-04-19" },
    { deliverable: "Publish 'Building Agentic Businesses with USD1' Developer Guide", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "HIGH", due_date: "2026-05-04" },
    { deliverable: "Publish 'Agent Paymaster' tutorial", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "HIGH", due_date: "2026-05-04" },
    { deliverable: "Run hackathon — active competition period", workstream: "5.3", status: "OPEN", owner: "Events Lead + Eng", timeline: "Days 30-45", category: "Phase 2: Execution", priority: "HIGH", due_date: "2026-05-04" },
    { deliverable: "USD1 Agentic Payment Specification published (Marketing packages)", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "Publish hackathon winners + case studies", workstream: "5.3", status: "OPEN", owner: "Content Lead", timeline: "Day 52", category: "Phase 2: Execution", priority: "MEDIUM", due_date: "2026-05-11" },
    { deliverable: "Submit white paper first draft to Legal + Engineering review", workstream: "5.4", status: "OPEN", owner: "Content Lead", timeline: "Day 60", category: "Phase 2: Execution", priority: "HIGH", due_date: "2026-05-19" },
    { deliverable: "Announce Agent Treasury open-source contract (post-audit)", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Day 60", category: "Phase 2: Execution", priority: "MEDIUM", due_date: "2026-05-19" },
    { deliverable: "Speaker submissions filed for Consensus, Token2049, Money 20/20", workstream: "5.3", status: "OPEN", owner: "Events Lead", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "USDC growth comparison data story published", workstream: "5.4", status: "OPEN", owner: "Content Lead + Data", timeline: "Day 45", category: "Phase 2: Execution", priority: "MEDIUM", due_date: "2026-05-04" },
    { deliverable: "First keynote delivered — Consensus or equivalent", workstream: "5.3", status: "OPEN", owner: "Executive + Mktg", timeline: "Day 60-75", category: "Phase 2: Execution", priority: "HIGH", due_date: "2026-06-03" },
    { deliverable: "Publish WLFI white paper: 'USD1 as Critical Infrastructure for the Agentic Economy'", workstream: "5.4", status: "OPEN", owner: "Content Lead", timeline: "Day 90", category: "Phase 3: Amplification", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "Distribute white paper to institutional contact list, sovereign wealth fund relationships", workstream: "5.4", status: "OPEN", owner: "PR + BD Leads", timeline: "Day 90", category: "Phase 3: Amplification", priority: "HIGH", due_date: "2026-06-18" },
    { deliverable: "Economic study published — distribute via press, media, institutional channels", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Day 120", category: "Phase 3: Amplification", priority: "MEDIUM", due_date: "2026-07-18" },
    { deliverable: "Ongoing weekly 'Agentic Economy' series — 12+ editions by Day 180", workstream: "5.2", status: "OPEN", owner: "Content Lead", timeline: "Ongoing", category: "Phase 3: Amplification", priority: "MEDIUM" },
    { deliverable: "Press milestone execution for each $500M market cap increment", workstream: "5.4", status: "OPEN", owner: "PR Lead", timeline: "Triggered", category: "Phase 3: Amplification", priority: "HIGH" },
    { deliverable: "Developer Guide V2 — updated for new chain deployments + hackathon learnings", workstream: "5.2", status: "OPEN", owner: "Content Lead + Eng", timeline: "Day 120", category: "Phase 3: Amplification", priority: "MEDIUM", due_date: "2026-07-18" },
  ].map((t) => ({ ...t, team_id: teamIds["marketing"] }));

  seedMany(engTasks);
  seedMany(bdTasks);
  seedMany(defiTasks);
  seedMany(legalTasks);
  seedMany(mktgTasks);
}
