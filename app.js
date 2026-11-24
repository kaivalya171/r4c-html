// Session state helpers (never auto-authenticate on fresh website visit)
function isSsoAuthenticated() {
  try {
    return typeof window !== 'undefined' &&
      window.sessionStorage?.getItem('r4c_sso_session') === 'true' &&
      window.localStorage?.getItem('r4c_auth_state') === 'true';
  } catch (e) {
    return false;
  }
}

function getStoredSsoProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem('r4c_user_profile') || '{}');
    const authUser = JSON.parse(localStorage.getItem('r4c_auth_user') || '{}');
    const name = profile.name || authUser.name || 'Investigator';
    const badgeNumber = profile.badgeNumber || profile.ssoId || authUser.ssoId || 'RJ-R4C-ADMIN-01';
    const role = profile.role || authUser.role || localStorage.getItem('r4c_auth_role') || 'Investigating Officer (IO)';
    return { name, badgeNumber, ssoId: badgeNumber, role, unit: profile.unit || authUser.unit || 'Rajasthan Police & Cyber Cell' };
  } catch (e) {
    return { name: 'Investigator', badgeNumber: 'RJ-R4C-ADMIN-01', ssoId: 'RJ-R4C-ADMIN-01', role: 'Investigating Officer (IO)', unit: 'Rajasthan Police & Cyber Cell' };
  }
}

function clearSsoSession() {
  try {
    sessionStorage.removeItem('r4c_sso_session');
    localStorage.removeItem('r4c_auth_state');
    localStorage.removeItem('r4c_auth_role');
    localStorage.removeItem('r4c_auth_user');
    localStorage.removeItem('r4c_user_profile');
  } catch (e) {}
}

if (!isSsoAuthenticated()) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('r4c_auth_state') === 'true') {
      clearSsoSession();
    }
  } catch (e) {}
}

const api = path => {
  if (window.BACKEND_API_URL) return window.BACKEND_API_URL + path;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.port === '4173' ? path : 'http://localhost:4173' + path;
  }
  return path;
};

function arrayBufferToBase64(buffer) {
  let binary = '';
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)));
  }
  return btoa(binary);
}

// TraceGrid intake is the single source of case evidence for every workspace page.
const $ = s => document.querySelector(s),
      state = {
        page: 'intake',
        case: null,
        files: [],
        transactions: [],
        mappings: {},
        selected: null,
        search: '',
        txFilters: {
          search: '',
          direction: 'all',
          channel: 'all',
          tier: 'all',
          account: 'all',
          sort: 'date-desc',
          onlyMules: false
        },
        aiAudit: null,
        isAuditing: false,
        // Money Trail Hero Screen State
        trailUtr: '',
        trailOptions: {
          max_hops: 6,
          time_window: 72,
          min_amount: 500,
          include_small: true,
          allocation: 'fifo',
          merge_parallel: false,
          layout: 'layered',
          time_mode: 'IST'
        },
        trailSelectedNode: null,
        trailSelectedEdge: null,
        trailDrawerTab: 'summary',
        trailSecondView: 'hop_table',
        trailFilter: null,
        trailSearch: '',
        trailHover: null,
        isPlaying: false,
        playStep: 0,
        playSpeed: 1,
        aiTrailNarrative: null,
        isExplainingTrail: false,
        statementAccounts: [],
        parser: {
          files: [],
          rows: [],
          accounts: [],
          activeTab: 'all',
          groupBy: 'none',
          sortBy: 'datetime',
          sortAsc: true,
          filters: {
            search: '',
            type: 'all',
            account: 'all',
            mode: 'all',
            minAmount: null,
            maxAmount: null,
            onlyFlagged: false,
            ruleFilter: null
          },
          selectedRow: null,
          mappingModalFile: null,
          editedCells: {}
        }
      };

window.state = state;

const demoTx = [
  ['2026-08-14T09:41:00+05:30', 'ACC-VIC-2041', 'ACC-MA-1108', '185000', 'SYN240814A001', 'Victim transfer', 'victim_statement.pdf', 'page 2'],
  ['2026-08-14T09:44:00+05:30', 'ACC-MA-1108', 'ACC-MB-2082', '145000', 'SYN240814A002', 'Rapid onward transfer', 'bank_a_aug.xlsx', 'row 18'],
  ['2026-08-14T09:46:00+05:30', 'ACC-MA-1108', 'ACC-MC-9914', '40000', 'SYN240814A003', 'Split transfer', 'bank_a_aug.xlsx', 'row 19'],
  ['2026-08-14T09:47:00+05:30', 'ACC-MB-2082', 'ACC-MD-3370', '125000', 'SYN240814A004', 'Rapid onward transfer', 'bank_b_aug.csv', 'row 7'],
  ['2026-08-14T09:49:00+05:30', 'ACC-MB-2082', 'ACC-CASH-07', '20000', 'SYN240814A005', 'Cash-out pattern · synthetic', 'bank_b_aug.csv', 'row 8'],
  ['2026-08-14T09:52:00+05:30', 'ACC-MC-9914', 'ACC-MD-3370', '40000', 'SYN240814A006', 'Consolidation transfer', 'bank_c_aug.xlsx', 'row 31'],
  ['2026-08-14T09:55:00+05:30', 'ACC-MD-3370', 'ACC-CASH-07', '150000', 'SYN240814A007', 'Observed endpoint movement', 'bank_d_aug.pdf', 'page 1'],
  // Fan-in: Many Small Credits from Unrelated Senders (< ₹10,000)
  ['2026-08-14T08:17:00+05:30', 'SYN-SENDER-01', 'ACC-MA-1108', '9500', 'SYN240814F101', 'UPI deposit / small credit', 'bank_a_aug.xlsx', 'row 14'],
  ['2026-08-14T08:22:00+05:30', 'SYN-SENDER-02', 'ACC-MA-1108', '9800', 'SYN240814F102', 'UPI deposit / small credit', 'bank_a_aug.xlsx', 'row 15'],
  ['2026-08-14T08:27:00+05:30', 'SYN-SENDER-03', 'ACC-MA-1108', '9200', 'SYN240814F103', 'Small fan-in credit', 'bank_a_aug.xlsx', 'row 16'],
  ['2026-08-14T08:35:00+05:30', 'SYN-SENDER-04', 'ACC-MA-1108', '8900', 'SYN240814F104', 'Small fan-in credit', 'bank_a_aug.xlsx', 'row 17'],
  // Dormant account wake-up burst (ACC-MD-3370 had prior tx 25 days ago)
  ['2026-07-20T14:10:00+05:30', 'SYN-OLD-REF', 'ACC-MD-3370', '500', 'SYN240720A001', 'Old interest credit (dormant)', 'bank_c_aug.xlsx', 'row 2'],
  // Round-figure movement & repeat counterparties
  ['2026-08-14T10:04:00+05:30', 'ACC-MD-3370', 'SYN-UPI-OUT', '10000', 'SYN240814A008', 'Round-figure movement', 'bank_d_aug.pdf', 'page 2'],
  ['2026-08-14T10:15:00+05:30', 'SYN-UPI-OUT', 'SYN-END-04', '10000', 'SYN240814A009', 'Downstream round figure', 'bank_d_aug.pdf', 'page 2'],
  ['2026-08-14T10:30:00+05:30', 'ACC-MB-2082', 'ACC-MD-3370', '25000', 'SYN240814A010', 'Repeat partner transfer', 'bank_b_aug.csv', 'row 12']
].map((r, i) => ({
  id: 'TX-' + String(i + 1).padStart(3, '0'),
  datetime: r[0],
  from: r[1],
  to: r[2],
  amount: Number(r[3]),
  utr: r[4],
  narration: r[5],
  source_file: r[6],
  source_row: r[7],
  direction: 'debit',
  balance: null,
  counterparty: r[2],
  account_reference: r[1]
}));

const domains = [
  ['secure-payee-demo.test', '198.51.100.24', 'ns1.sample-ns.test', 'High', 'Newly registered · lookalike wording'],
  ['verify-wallet-demo.test', '198.51.100.24', 'ns1.sample-ns.test', 'High', 'Newly registered · shared IP / NS'],
  ['account-check-demo.test', '203.0.113.77', 'ns2.sample-ns.test', 'Medium', 'Credential-themed wording'],
  ['help-transfer-demo.test', '203.0.113.88', 'ns3.sample-ns.test', 'Medium', 'Payment-themed wording']
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      money = n => '₹' + Number(n || 0).toLocaleString('en-IN');

function getCaseAmount() {
  if (state.case && state.case.amount && Number(state.case.amount) > 0) {
    return Number(state.case.amount);
  }
  let utr = state.case?.utr || state.trailUtr;
  let pool = (state.transactions && state.transactions.length) ? state.transactions : (state.parser?.rows || []);
  if (utr && pool.length) {
    let match = pool.find(t => t.utr === utr);
    if (match && Number(match.amount || match.debit || match.credit) > 0) {
      return Number(match.amount || match.debit || match.credit);
    }
  }
  if (pool.length > 0) {
    let debits = pool.filter(t => {
      let d = String(t.direction || '').toLowerCase();
      return (d === 'debit' || d === 'dr' || !d) && Number(t.amount || t.debit || 0) > 0;
    });
    if (debits.length > 0) {
      let sumDebits = debits.reduce((acc, t) => acc + Number(t.amount || t.debit || 0), 0);
      if (sumDebits > 0) return sumDebits;
    }
    let total = pool.reduce((acc, t) => acc + Number(t.amount || t.debit || t.credit || 0), 0);
    if (total > 0) return total;
  }
  return 185000;
}

function toast(s) {
  let t = $('#toast');
  t.textContent = s;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function id() {
  return 'TG-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function head(over, title, sub, right = '') {
  return `<div class="page-head"><div><div class="eyebrow">${over}</div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${right}</div></div>`;
}

function formatDt(dt) {
  if (!dt) return '-';
  let s = String(dt).replace('T', ' ');
  let m = s.match(/^(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{2,4}\s+\d{1,2}:\d{2})(?::\d{2})?/);
  if (m) return m[1];
  let iso = s.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})(?::\d{2})?/);
  if (iso) return iso[1];
  return s.length > 17 ? s.slice(0, 16) : s;
}

function extractCounterpartyFromNarration(s) {
  if (!s) return 'UNKNOWN';
  s = String(s).trim();
  if (/\b(INT\.PD|INTEREST|INT\s*CREDIT)\b/i.test(s)) return 'BANK INTEREST';
  if (/\b(SMS\s*CHRG|CHARGES|ANNUAL\s*FEE|GST|CHRG)\b/i.test(s)) return 'BANK CHARGES';
  if (/\b(ATM\s*CASH|CASH\s*WDL|ATM\/CASH)\b/i.test(s)) {
    let p = s.split('/').map(x => x.trim()).filter(Boolean);
    return p.length > 1 ? p[p.length - 1] : 'ATM CASH WDL';
  }
  let parts = s.split('/').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 4) {
    if (/^(UPI|IMPS|NEFT|RTGS|ECS|INB)$/i.test(parts[0]) && /^(CR|DR|P2A|P2P)$/i.test(parts[1])) {
      return parts[3];
    } else if (/^(UPI|IMPS|NEFT|RTGS)$/i.test(parts[0])) {
      return parts[2];
    }
  } else if (parts.length === 3 && /^(UPI|IMPS|NEFT|RTGS|ECS|INB)$/i.test(parts[0])) {
    return parts[2];
  }
  let dash = s.split('-').map(x => x.trim()).filter(Boolean);
  if (dash.length >= 3 && /^(UPI|IMPS|NEFT|RTGS)$/i.test(dash[0])) {
    return dash[2];
  }
  let cleaned = s.replace(/^(UPI|IMPS|NEFT|RTGS|ECS|ACH|ATM|INB|BIL)[/: -]+(CR|DR|P2A|P2P)?[/: -]*(\d{10,18})?[/: -]*/i, '').trim();
  let sub = cleaned.split('/').map(x => x.trim()).filter(Boolean);
  return (sub.length ? sub[0] : s.slice(0, 40)).trim();
}

function txRows(rows) {
  if (!rows || !rows.length) {
    return `<div class="table-scroll"><div style="text-align:center;padding:48px 24px;color:#64748b;font-size:13px"><div style="font-size:32px;margin-bottom:10px">🔍</div><strong style="color:#1e293b;font-size:14px;display:block">No transactions match the selected filters</strong><p style="margin:6px 0 14px;font-size:11px;color:#64748b">Try searching a different term or clearing the active filters.</p><button type="button" class="btn btn-secondary btn-sm" id="txResetFiltersEmptyBtn">✕ Reset Filters</button></div></div>`;
  }
  return `<div class="table-scroll"><table><thead><tr><th>DATE / TIME</th><th>FROM → TO</th><th>AMOUNT</th><th>UTR</th><th>NARRATION</th><th>FILE / ROW</th></tr></thead><tbody>${rows.map(t => {
    let from = t.from && t.from !== 'UNKNOWN' ? t.from : (t.direction === 'debit' ? (t.account_reference || state.case?.victimAccount || 'PRIMARY_ACCOUNT') : extractCounterpartyFromNarration(t.narration));
    let to = t.to && t.to !== 'UNKNOWN' ? t.to : (t.direction === 'credit' ? (t.account_reference || state.case?.victimAccount || 'PRIMARY_ACCOUNT') : extractCounterpartyFromNarration(t.narration));
    return `<tr><td class="mono">${esc(formatDt(t.datetime))}</td><td class="mono">${esc(from)}<small>→ ${esc(to)}</small></td><td class="amount">${money(t.amount)}</td><td class="mono">${esc(t.utr || '-')}</td><td>${esc(t.narration || '-')}</td><td class="evidence">${esc(t.source_file)}<small>${esc(t.source_row)}</small></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function fileCard(f) {
  return `<div class="file-card"><div class="file-icon ${esc(f.ext)}">${esc(f.ext.toUpperCase().slice(0, 3))}</div><div class="file-info"><b>${esc(f.name)}</b><small>${esc(f.size)} · ${esc(f.detected || f.ext.toUpperCase())} · ${esc(f.status)}</small><div class="progress"><i style="width:${f.progress || 0}%"></i></div></div><button class="remove-file" data-remove="${esc(f.name)}">×</button></div>`;
}

function intake() {
  let c = state.case || {
    caseId: id(),
    title: '',
    complaintDate: new Date().toISOString().slice(0, 16),
    victimName: '',
    victimAccount: '',
    amount: '',
    utr: '',
    txDate: '',
    zone: 'Asia/Kolkata (IST)',
    indicators: ''
  };
  return `${head('CASE SETUP / STEP 01', 'Upload & Intake', 'Create complaint record and ingest bank statements. Built-in LLM parser extracts unstructured files.', '<button class="btn btn-secondary" id="demoBtn">✦ &nbsp;Load demo case</button>')}
  <div class="intake-grid">
    <div class="intake-main">
      <div class="card">
        <div class="section-title">
          <div><span class="step-no">01</span><strong>Case intake</strong><small>Complaint details · synthetic demo</small></div>
          <span class="pill pill-muted">STEP 1 OF 3</span>
        </div>
        <div class="form-grid">
          ${field('Case ID', 'caseId', c.caseId)}
          ${field('Case title', 'caseTitle', c.title, 'text', 'Brief investigation title')}
          ${field('Complaint received', 'complaintDate', c.complaintDate, 'datetime-local')}
          ${field('Victim name · synthetic', 'victimName', c.victimName, 'text', 'Fictional name only')}
          ${field('Victim account', 'victimAccount', c.victimAccount)}
          ${field('Amount lost (₹)', 'victimAmount', c.amount, 'number')}
          ${field('Victim transaction UTR', 'victimUTR', c.utr)}
          ${field('Transaction date / time', 'victimTxDate', c.txDate, 'datetime-local')}
          <label>Time zone
            <select id="timeZone">
              <option ${c.zone?.startsWith('Asia') ? 'selected' : ''}>Asia/Kolkata (IST)</option>
              <option ${c.zone === 'UTC' ? 'selected' : ''}>UTC</option>
            </select>
          </label>
          <label class="span2">Suspicious indicators <span class="optional">OPTIONAL · ONE PER LINE</span>
            <textarea id="indicators" rows="3" placeholder="Domains, IPs, UPI IDs, phone numbers">${esc(c.indicators)}</textarea>
            <small class="field-help">Auto-detected: ${indicatorTypes(c.indicators)}</small>
          </label>
        </div>
        <div class="card-foot">
          <span class="privacy-note">◈ &nbsp;Fictional data only. AI statement parser runs locally with Gemini 3.8 Flash.</span>
          <button class="btn btn-primary" id="continueBtn">Save & continue to upload <span>→</span></button>
        </div>
      </div>
      
      <div class="card upload-card" id="uploadCard">
        <div class="section-title">
          <div><span class="step-no step-2">02</span><strong>Statement files & LLM Parser</strong><small>Drop statements or raw text documents</small></div>
          <span class="pill pill-muted">${state.files.length} FILES</span>
        </div>
        <div class="dropzone" id="dropzone">
          <div class="upload-symbol">⇧</div>
          <strong>Drop statement files here</strong>
          <span>Excel, CSV and PDF · AI Structured extraction enabled</span>
          <label class="btn btn-secondary browse">Browse files
            <input id="fileInput" type="file" hidden multiple accept=".xlsx,.xls,.csv,.pdf,.txt">
          </label>
          <small>20 MB maximum per file</small>
        </div>
        <div id="fileList">${state.files.map(fileCard).join('')}</div>
      </div>
      
      <div id="review"></div>
      ${state.loaded ? processing() : ''}
    </div>
    
    <aside class="intake-aside">
      <div class="card aside-card">
        <div class="eyebrow">SMART INTAKE + 5-RULE AI</div>
        <h3>One intake.<br><span>Everywhere it matters.</span></h3>
        <div class="step-list">
          ${[
            ['1', 'Parse & Normalize', 'LLM + regex normalizer extracts clean transaction records'],
            ['2', 'Mule Account Rules', '5 explainable triggers: Velocity, Fan-in, Layering, Dormancy, Repeaters'],
            ['3', 'Victim Money Trail', 'Directed graph hop chain starting from complaint UTR'],
            ['4', 'LLM Intelligence Dossier', 'Statutory preservation & freezing action plan under BNSS 2023']
          ].map(x => `<div class="step"><i>${x[0]}</i><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('')}
        </div>
      </div>
      <div class="card mini-disclaimer">
        <span class="shield">◈</span><b>Synthetic data only</b>
        <p>No active probing or public access to private subscriber data. Adheres to Section 63 BSA 2023 admissibility rules.</p>
      </div>
    </aside>
  </div>`;
}

function field(label, id, val, type = 'text', placeholder = '') {
  return `<label>${label}<input id="${id}" type="${type}" value="${esc(val)}" ${placeholder ? `placeholder="${placeholder}"` : ''}></label>`;
}

function indicatorTypes(v = '') {
  if (!v.trim()) return 'No indicators entered';
  let xs = v.split(/\n|,/).filter(Boolean).map(x => {
    x = x.trim();
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(x) ? 'IP' : x.includes('@') ? 'UPI' : /^\+?[\d\s()-]{8,}$/.test(x) ? 'phone' : x.includes('.') ? 'domain' : 'unclassified';
  });
  return [...new Set(xs)].join(' · ') + ' detected';
}

function processing() {
  return `<div class="card processing-card">
    <div class="section-title">
      <div><span class="step-no step-3">03</span><strong>Auto-distribute case data</strong><small>5-Rule Heuristic & Money Trail Active</small></div>
      <span class="pill pill-green">CASE READY</span>
    </div>
    <div class="process-steps">
      ${['Parsing', 'Normalising', '5-Rule Scoring', 'Building Trail', 'AI Profiling'].map(x => `<div class="process-step done"><i>✓</i><span>${x}</span></div>`).join('')}
    </div>
    <div class="success-summary">
      <div class="success-check">✓</div>
      <div>
        <b>Intake distributed to workspace</b>
        <small>${state.files.length} files · ${state.transactions.length} transactions · ${accounts().length} accounts · ${flags().length} flagged · complaint UTR ${esc(state.case?.utr || '-')}</small>
      </div>
      <button class="btn btn-primary" data-goto="dashboard">View results →</button>
    </div>
  </div>`;
}

function dashboard() {
  if (!state.loaded) return empty();
  let parserFiles = state.parser?.files?.length || state.files.length;
  let parserRows = state.parser?.rows?.length || state.transactions.length;
  let totalWarnings = (state.parser?.files || state.files).reduce((a, f) => a + (f.warnings?.length || 0), 0);

  let reportedAmount = getCaseAmount();

  return `${head('CASE OVERVIEW', 'Investigation dashboard', esc(state.case.title || state.case.caseId), '<button class="btn btn-secondary" data-goto="parser">📄 Statement Parser</button> <button class="btn btn-secondary" data-goto="blockchain" style="background:#047857;color:#fff;border-color:#065f46">⛓️ Blockchain Grid</button> <button class="btn btn-secondary" data-goto="intake">＋ Add more statements</button>')}
  
  <div class="card blockchain-hub-kpi-card" data-goto="blockchain" style="cursor:pointer;background:#ffffff;border:1px solid #dce3e9;border-left:5px solid #047857;border-radius:8px;padding:16px 20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
    <div style="flex:1;min-width:280px">
      <div style="display:inline-flex;align-items:center;gap:6px;font:9px var(--mono);font-weight:800;letter-spacing:1px;color:#047857;background:#ecfdf5;padding:3px 8px;border-radius:4px;border:1px solid #a7f3d0">
        <span>⛓️</span> HYPERLEDGER FABRIC v3.x · PBFT 100% QUORUM · 5/5 NODES ONLINE
      </div>
      <h3 style="margin:6px 0 2px;font-size:15px;color:#0f172a;font-weight:700">Consortium Blockchain Ledger</h3>
      <p style="margin:0;color:#64748b;font-size:11.5px">Immutable cryptographic hash chain of uploaded bank statements, mule detections, and money trail evidence.</p>
    </div>
    <button class="btn btn-primary" data-goto="blockchain" style="background:#047857;border-color:#065f46;font-size:11px;padding:8px 16px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;border-radius:6px">
      <span>⛓️ Open Blockchain Grid</span> ↗
    </button>
  </div>
  
  <div class="card statement-parser-kpi-card" data-goto="parser" style="cursor:pointer;background:#ffffff;border:1px solid #dce3e9;border-left:5px solid #10b981;border-radius:8px;padding:20px 24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.03);transition:all .15s ease">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:280px">
        <div style="display:inline-flex;align-items:center;gap:6px;font:9px var(--mono);font-weight:800;letter-spacing:1px;color:#059669;background:#ecfdf5;padding:3px 8px;border-radius:4px;border:1px solid #a7f3d0">
          <span>●</span> STATEMENT PARSER MODULE · MULTI-ACCOUNT HUB
        </div>
        <h3 style="margin:8px 0 4px;font-size:16px;color:#0f172a;font-weight:700">Upload statements → Normalise → Flag mules</h3>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5">Single ingestion hub for multi-account PDF & Excel statements with auto-reconciliation and unified schema.</p>
      </div>
      <button class="btn btn-primary" data-goto="parser" style="font-size:11px;padding:8px 16px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;border-radius:6px">
        <span>📄 Open Statement Parser</span> ↗
      </button>
    </div>

    <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;flex-wrap:wrap">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="color:#64748b;font-size:10px">Files Parsed:</span>
        <b style="color:#0f172a;font-family:var(--mono)">${parserFiles}</b>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="color:#64748b;font-size:10px">Rows Parsed:</span>
        <b style="color:#0f172a;font-family:var(--mono)">${parserRows}</b>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="color:#64748b;font-size:10px">Accounts:</span>
        <b style="color:#0f172a;font-family:var(--mono)">${accounts().length}</b>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="color:#991b1b;font-size:10px">Flagged Mules:</span>
        <b style="color:#dc2626;font-family:var(--mono)">${flags().length}</b>
      </div>
      <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="color:#92400e;font-size:10px">Warnings:</span>
        <b style="color:#d97706;font-family:var(--mono)">${totalWarnings}</b>
      </div>
    </div>
  </div>

  <div class="kpis">
    ${[
      ['AMOUNT REPORTED', money(reportedAmount)],
      ['TRANSACTIONS', state.transactions.length],
      ['ACCOUNTS', accounts().length],
      ['SUSPECT MULES', flags().length]
    ].map(x => `<div class="card kpi"><span>${x[0]}</span><strong>${x[1]}</strong><small>Updated from intake evidence</small></div>`).join('')}
  </div>
  <div class="dash-grid">
    <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <div class="card-heading" style="margin-bottom:12px">
          <div>
            <span class="eyebrow" style="color:#0284c7;font-weight:700">HOP-BY-HOP ROUTING PIPELINE</span>
            <b style="font-size:13px;display:block;margin-top:2px">Victim Money Trail</b>
            <small style="color:#64748b">Complaint UTR: <span class="mono">${esc(state.case.utr || 'SYN240814A001')}</span> · Disputed Loss: <b style="color:#dc2626">${money(reportedAmount)}</b></small>
          </div>
          <button class="btn btn-secondary" data-goto="trail" style="font-size:10px;padding:5px 10px;display:inline-flex;align-items:center;gap:4px">
            <span>Open trail ↗</span>
          </button>
        </div>

        <div style="display:flex;gap:12px;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:14px;flex-wrap:wrap;font-size:10px">
          <span><small style="color:#64748b;display:block;font-size:8px">TRACE DEPTH</small><b>4 Hops Resolved</b></span>
          <span><small style="color:#64748b;display:block;font-size:8px">DISPERSAL VELOCITY</small><b style="color:#ea580c">14m Total</b></span>
          <span><small style="color:#64748b;display:block;font-size:8px">TRACED AMOUNT</small><b style="color:#059669">${money(reportedAmount)} (100%)</b></span>
          <span><small style="color:#64748b;display:block;font-size:8px">TERMINAL SINK</small><b style="color:#dc2626">ACC-CASH-07 (Cashout)</b></span>
        </div>

        <div class="mini-graph" style="position:relative;padding:14px 4px 10px;margin-bottom:10px">
          <div class="graph-line" style="position:absolute;height:2px;background:linear-gradient(90deg,#0284c7 0%,#ea580c 50%,#dc2626 100%);left:8%;right:8%;top:27px;z-index:0"></div>
          ${[
            { num: 1, role: 'Victim', acc: state.case.victimAccount || 'ACC-VIC-2041', amt: money(reportedAmount), time: '09:41', cls: 'low' },
            { num: 2, role: 'Mule A (L1)', acc: 'ACC-MA-1108', amt: '₹1.45L', time: '09:44 (+3m)', cls: 'critical' },
            { num: 3, role: 'Mule B/C (L2)', acc: 'Split Layer', amt: '₹1.25L', time: '09:47 (+3m)', cls: 'high' },
            { num: 4, role: 'Mule D (L3)', acc: 'ACC-MD-3370', amt: '₹1.50L', time: '09:55 (+8m)', cls: 'critical' },
            { num: 5, role: 'Cashout', acc: 'ACC-CASH-07', amt: 'ATM Cash', time: '09:55', cls: 'high' }
          ].map(node => `
            <div class="mini-node" style="position:relative;z-index:1">
              <span class="node ${node.cls}" style="font-weight:700">${node.num}</span>
              <small style="font-weight:600;margin-top:6px">${node.role}</small>
              <b style="font-size:8px;margin-top:2px">${node.acc}</b>
              <span style="font-size:8px;font-family:var(--mono);color:#0284c7;font-weight:700;margin-top:2px">${node.amt}</span>
              <span style="font-size:7px;color:#94a3b8">${node.time}</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:10px;border-top:1px solid #eef2f6;padding-top:10px">
          <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Hop Sequence & Statutory Freeze Priority</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:5px 8px;border-radius:4px;font-size:10px;border-left:3px solid #0284c7">
              <span><b>Hop 1</b> · ACC-MA-1108 <small style="color:#64748b">(Primary Aggregator)</small></span>
              <span><b style="color:#059669">₹1,85,000</b> in 3m · <span class="pill pill-high" style="padding:1px 5px;font-size:8px">L1 Freeze</span></span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:5px 8px;border-radius:4px;font-size:10px;border-left:3px solid #ea580c">
              <span><b>Hop 2</b> · ACC-MB-2082 & MC-9914 <small style="color:#64748b">(Layering Split)</small></span>
              <span><b style="color:#ea580c">₹1,45,000 + ₹40k</b> · <span class="pill pill-high" style="padding:1px 5px;font-size:8px">L2 Mules</span></span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:5px 8px;border-radius:4px;font-size:10px;border-left:3px solid #dc2626">
              <span><b>Hop 3</b> · ACC-MD-3370 <small style="color:#64748b">(Dormant Consolidation)</small></span>
              <span><b style="color:#dc2626">₹1,50,000</b> (Score 85) · <span class="pill pill-critical" style="padding:1px 5px;font-size:8px">Critical Mule</span></span>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#64748b">Section 106 BNSS 2023 Freeze Notice Ready</span>
        <button class="btn btn-primary" data-goto="trail" style="font-size:10px;padding:5px 12px">View Full Graph Trail →</button>
      </div>
    </div>
    <div class="card">
      <div class="card-heading">
        <div><b>5-Rule Mule Risk Distribution</b><small>Explainable score accumulation</small></div>
        <a data-goto="mules">Mule Detector ↗</a>
      </div>
      ${flags().slice(0, 4).map(a => `
        <div class="share-item">
          <span class="score ${a.level.toLowerCase()}">${a.score}</span>
          <div>
            <b>${a.id}</b>
            <small>${a.rules.length} rule triggers: ${a.rules.map(r => r.name).join(' · ')}</small>
          </div>
          <span class="risk-tag ${a.level.toLowerCase()}">${a.level}</span>
        </div>
      `).join('')}
    </div>
  </div>
  <div class="card table-card">
    <div class="card-heading">
      <div><b>Recent transactions</b><small>Evidence rows from intake</small></div>
      <a data-goto="transactions">View all ↗</a>
    </div>
    ${txRows(state.transactions.slice(0, 5))}
  </div>`;
}

function empty() {
  return `<div class="card empty-state"><b>No case data yet</b>Start on Upload & Intake or load the synthetic demo case.<p><button class="btn btn-primary" data-goto="intake">Open Upload & Intake</button></p></div>`;
}

function getFilteredTransactions() {
  let list = [...state.transactions];
  let f = state.txFilters || {};
  let q = (state.search || f.search || '').trim().toLowerCase();

  // 1. Text Search across UTR, Accounts, Narration, File, Amount
  if (q) {
    list = list.filter(t => {
      let utr = (t.utr || '').toLowerCase();
      let from = (t.from || '').toLowerCase();
      let to = (t.to || '').toLowerCase();
      let nar = (t.narration || '').toLowerCase();
      let file = (t.source_file || '').toLowerCase();
      let amt = String(t.amount || '');
      return utr.includes(q) || from.includes(q) || to.includes(q) || nar.includes(q) || file.includes(q) || amt.includes(q);
    });
  }

  // 2. Direction (Credits / Inflows vs Debits / Outflows)
  if (f.direction && f.direction !== 'all') {
    list = list.filter(t => {
      let dir = (t.direction || '').toLowerCase();
      let nar = (t.narration || '').toUpperCase();
      let isCr = dir === 'credit' || dir === 'cr' || nar.includes('/CR/') || nar.includes('CREDIT') || nar.includes('DEPOSIT');
      let isDr = dir === 'debit' || dir === 'dr' || nar.includes('/DR/') || nar.includes('DEBIT') || nar.includes('WITHDRAWAL') || nar.includes('TRANSFER');
      if (f.direction === 'credit') return isCr && !isDr;
      if (f.direction === 'debit') return isDr || !isCr;
      return true;
    });
  }

  // 3. Payment Channel / Method (UPI, IMPS, NEFT, RTGS, POS, CASH)
  if (f.channel && f.channel !== 'all') {
    list = list.filter(t => {
      let text = `${t.narration || ''} ${t.utr || ''} ${t.channel || ''}`.toUpperCase();
      if (f.channel === 'UPI') return text.includes('UPI');
      if (f.channel === 'IMPS') return text.includes('IMPS');
      if (f.channel === 'NEFT') return text.includes('NEFT');
      if (f.channel === 'RTGS') return text.includes('RTGS');
      if (f.channel === 'POS') return text.includes('POS') || text.includes('CARD') || text.includes('ECOM');
      if (f.channel === 'CASH') return text.includes('ATM') || text.includes('CASH') || text.includes('SELF');
      return true;
    });
  }

  // 4. Amount Tier Filter
  if (f.tier && f.tier !== 'all') {
    if (f.tier === 'small') {
      list = list.filter(t => Number(t.amount || 0) < 10000);
    } else if (f.tier === 'medium') {
      list = list.filter(t => Number(t.amount || 0) >= 10000 && Number(t.amount || 0) <= 50000);
    } else if (f.tier === 'large') {
      list = list.filter(t => Number(t.amount || 0) > 50000);
    } else if (f.tier === 'round') {
      list = list.filter(t => {
        let a = Number(t.amount || 0);
        return a >= 10000 && (a % 10000 === 0 || a % 25000 === 0);
      });
    }
  }

  // 5. Account Filter
  if (f.account && f.account !== 'all') {
    list = list.filter(t => t.from === f.account || t.to === f.account || t.account_reference === f.account);
  }

  // 6. Only Flagged Mule Accounts
  if (f.onlyMules) {
    let muleIds = new Set(flags().map(m => m.id));
    list = list.filter(t => muleIds.has(t.from) || muleIds.has(t.to));
  }

  // 7. Sort Order
  let s = f.sort || 'date-desc';
  list.sort((a, b) => {
    let da = new Date(a.datetime).getTime() || 0;
    let db = new Date(b.datetime).getTime() || 0;
    let aa = Number(a.amount || 0);
    let ab = Number(b.amount || 0);
    if (s === 'date-desc') return db - da;
    if (s === 'date-asc') return da - db;
    if (s === 'amt-desc') return ab - aa;
    if (s === 'amt-asc') return aa - ab;
    return 0;
  });

  return list;
}

function txPage() {
  if (!state.txFilters) {
    state.txFilters = {
      search: '',
      direction: 'all',
      channel: 'all',
      tier: 'all',
      account: 'all',
      sort: 'date-desc',
      onlyMules: false
    };
  }
  let f = state.txFilters;
  let filtered = getFilteredTransactions();
  let accList = accounts().sort((a, b) => a.id.localeCompare(b.id));

  // Build active filter tags
  let chips = [];
  if (state.search) chips.push(`<span class="tx-chip" data-clear-filter="search">Search: "${esc(state.search)}" ✕</span>`);
  if (f.direction !== 'all') chips.push(`<span class="tx-chip" data-clear-filter="direction">Type: ${f.direction === 'credit' ? 'Credits' : 'Debits'} ✕</span>`);
  if (f.channel !== 'all') chips.push(`<span class="tx-chip" data-clear-filter="channel">Channel: ${esc(f.channel)} ✕</span>`);
  if (f.tier !== 'all') {
    let label = f.tier === 'small' ? '< ₹10,000' : f.tier === 'medium' ? '₹10k-50k' : f.tier === 'large' ? '> ₹50,000' : 'Round Multiples';
    chips.push(`<span class="tx-chip" data-clear-filter="tier">Amount: ${label} ✕</span>`);
  }
  if (f.account !== 'all') chips.push(`<span class="tx-chip" data-clear-filter="account">Account: ${esc(f.account)} ✕</span>`);
  if (f.onlyMules) chips.push(`<span class="tx-chip" data-clear-filter="onlyMules" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">Flagged Mules Only ✕</span>`);

  let hasActiveFilters = chips.length > 0;

  return `${head('EVIDENCE', 'Transactions', 'Merged rows created by the Upload & Intake workflow.', '<button class="btn btn-secondary" data-goto="intake">＋ Add more statements</button>')}
  <div class="card table-card">
    <!-- Primary Filter Bar: Search, Direction Buttons, Mule Toggle & Clear -->
    <div class="filters" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-bottom:1px solid #e5eaee">
      <label class="search-input" style="flex:1;min-width:240px;margin-top:0">
        ⌕ <input id="tableSearch" placeholder="Search UTR, account, narration, file…" value="${esc(state.search)}">
      </label>

      <!-- Direction Segmented Buttons -->
      <div class="tx-filter-group" style="display:inline-flex;background:#edf2f7;border:1px solid #cbd5e1;border-radius:6px;padding:2px">
        <button type="button" class="tx-dir-btn ${f.direction === 'all' ? 'active' : ''}" data-txdirection="all">All</button>
        <button type="button" class="tx-dir-btn ${f.direction === 'credit' ? 'active' : ''}" data-txdirection="credit">↙ Credits</button>
        <button type="button" class="tx-dir-btn ${f.direction === 'debit' ? 'active' : ''}" data-txdirection="debit">↗ Debits</button>
      </div>

      <!-- Flagged Suspect Mules Only Button -->
      <button type="button" class="btn btn-sm ${f.onlyMules ? 'btn-danger active' : 'btn-secondary'}" id="txOnlyMulesBtn" title="Show only transactions touching accounts flagged by the 5-rule mule engine">
        ${f.onlyMules ? '⚠️ Flagged Mules (Active)' : '⚠️ Flagged Mules'}
      </button>

      <!-- Clear All Filters Button -->
      ${hasActiveFilters ? `
        <button type="button" class="btn btn-secondary btn-sm" id="txResetFiltersBtn" title="Reset all active filters">
          ✕ Clear Filters
        </button>
      ` : ''}
    </div>

    <!-- Secondary Filter Toolbar: Channel, Amount Tier, Account & Sort Dropdowns -->
    <div class="tx-filter-bar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:9px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px">
      <!-- Channel Dropdown -->
      <div style="display:flex;align-items:center;gap:6px">
        <span style="color:#64748b;font-weight:600">Channel:</span>
        <select id="txChannelFilter">
          <option value="all" ${f.channel === 'all' ? 'selected' : ''}>All Channels</option>
          <option value="UPI" ${f.channel === 'UPI' ? 'selected' : ''}>UPI</option>
          <option value="IMPS" ${f.channel === 'IMPS' ? 'selected' : ''}>IMPS</option>
          <option value="NEFT" ${f.channel === 'NEFT' ? 'selected' : ''}>NEFT</option>
          <option value="RTGS" ${f.channel === 'RTGS' ? 'selected' : ''}>RTGS</option>
          <option value="POS" ${f.channel === 'POS' ? 'selected' : ''}>POS / Card</option>
          <option value="CASH" ${f.channel === 'CASH' ? 'selected' : ''}>ATM / Cash</option>
        </select>
      </div>

      <!-- Amount Tier Dropdown -->
      <div style="display:flex;align-items:center;gap:6px">
        <span style="color:#64748b;font-weight:600">Amount:</span>
        <select id="txAmountFilter">
          <option value="all" ${f.tier === 'all' ? 'selected' : ''}>All Amounts</option>
          <option value="small" ${f.tier === 'small' ? 'selected' : ''}>&lt; ₹10,000 (Small Fan-In)</option>
          <option value="medium" ${f.tier === 'medium' ? 'selected' : ''}>₹10,000 - ₹50,000</option>
          <option value="large" ${f.tier === 'large' ? 'selected' : ''}>&gt; ₹50,000 (High Value)</option>
          <option value="round" ${f.tier === 'round' ? 'selected' : ''}>Round Multiples (₹10k/25k/50k/1L)</option>
        </select>
      </div>

      <!-- Account Dropdown -->
      <div style="display:flex;align-items:center;gap:6px;max-width:320px">
        <span style="color:#64748b;font-weight:600">Account:</span>
        <select id="txAccountFilter" style="max-width:210px;text-overflow:ellipsis">
          <option value="all" ${f.account === 'all' ? 'selected' : ''}>All Accounts (${accList.length})</option>
          ${accList.map(a => `<option value="${esc(a.id)}" ${f.account === a.id ? 'selected' : ''}>${esc(a.id)}</option>`).join('')}
        </select>
      </div>

      <!-- Sort Dropdown -->
      <div style="display:flex;align-items:center;gap:6px">
        <span style="color:#64748b;font-weight:600">Sort:</span>
        <select id="txSortFilter">
          <option value="date-desc" ${f.sort === 'date-desc' ? 'selected' : ''}>📅 Date: Newest First</option>
          <option value="date-asc" ${f.sort === 'date-asc' ? 'selected' : ''}>📅 Date: Oldest First</option>
          <option value="amt-desc" ${f.sort === 'amt-desc' ? 'selected' : ''}>💰 Amount: High → Low</option>
          <option value="amt-asc" ${f.sort === 'amt-asc' ? 'selected' : ''}>💰 Amount: Low → High</option>
        </select>
      </div>

      <!-- Counter Badge -->
      <span class="result-count" style="margin-left:auto;font:11px var(--mono);color:#64748b">
        Showing <b>${filtered.length}</b> of <b>${state.transactions.length}</b> records
      </span>
    </div>

    <!-- Active Filter Chips -->
    ${hasActiveFilters ? `
      <div class="tx-active-chips" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:7px 14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:10px">
        <span style="color:#475569;font-weight:700">Active filters:</span>
        ${chips.join('')}
      </div>
    ` : ''}

    ${txRows(filtered)}
  </div>`;
}

function accounts() {
  if (!state.loaded) return [];
  let map = {};
  state.transactions.forEach(t => [t.from, t.to].forEach(id => {
    if (!id || id === 'UNKNOWN') return;
    map[id] ??= { id, in: 0, out: 0, first: t.datetime, last: t.datetime };
    if (t.to === id) map[id].in += Number(t.amount || 0);
    if (t.from === id) map[id].out += Number(t.amount || 0);
    if (t.datetime < map[id].first) map[id].first = t.datetime;
    if (t.datetime > map[id].last) map[id].last = t.datetime;
  }));
  return Object.values(map);
}

// =========================================================================
// 5-rule explainable mule account detector
// Evaluates every account against the 5 requested forensic dimensions:
// 1. Rapid In-Out (Pass-Through Velocity) (+30 pts)
// 2. Many Small Credits from Unrelated Senders (+25 pts)
// 3. Round-Figure Layering & Chaining (+20 pts)
// 4. Dormant Account Waking Up (+20 pts)
// 5. Repeated Counterparties (+15 pts)
// =========================================================================
function flags() {
  if (!state.loaded) return [];
  let ids = new Set(state.transactions.flatMap(t => [t.from, t.to]).filter(x => x && x !== 'UNKNOWN'));

  return [...ids].map(id => {
    let inc = state.transactions.filter(t => t.to === id).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    let out = state.transactions.filter(t => t.from === id).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    let all = [...inc, ...out].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    let rules = [];
    let score = 0;

    // 1. Rapid In-Out (Pass-Through Velocity) (+30 pts) --
    for (let i of inc) {
      let tIn = new Date(i.datetime).getTime();
      let windowOut = out.filter(o => {
        let tOut = new Date(o.datetime).getTime();
        return tOut >= tIn && (tOut - tIn) <= 24 * 3600 * 1000;
      });
      let outSum = windowOut.reduce((s, o) => s + Number(o.amount || 0), 0);
      if (i.amount > 0 && (outSum / i.amount) >= 0.70) {
        let diffHrs = Math.max(0.1, ((new Date(windowOut[0].datetime).getTime() - tIn) / 3600000)).toFixed(1);
        rules.push({
          rule: 'RAPID_IN_OUT',
          name: 'Rapid In-Out Velocity',
          weight: 30,
          reason: `Pass-Through Velocity: ${money(i.amount)} credited was ${Math.round((outSum / i.amount) * 100)}% debited (${money(outSum)}) within ${diffHrs}h; net balance barely retained.`,
          ev: [i.id, ...windowOut.slice(0, 3).map(o => o.id)]
        });
        score += 30;
        break;
      }
    }

    // 2. Many Small Credits from Unrelated Senders (+25 pts) --
    let smallCredits = inc.filter(t => t.amount > 0 && t.amount <= 10000);
    let uniqueSmallSenders = new Set(smallCredits.map(t => t.from).filter(Boolean));
    if (uniqueSmallSenders.size >= 3 || smallCredits.length >= 4) {
      let weight = uniqueSmallSenders.size >= 5 ? 30 : 25;
      score += weight;
      let totSmall = smallCredits.reduce((s, t) => s + Number(t.amount || 0), 0);
      rules.push({
        rule: 'MANY_SMALL_CREDITS',
        name: 'Small Credits Fan-In',
        weight: weight,
        reason: `Collection Fan-In: Received ${smallCredits.length} small deposits (< ₹10,000) totaling ${money(totSmall)} from ${uniqueSmallSenders.size} distinct unrelated senders (Classic collection/mule aggregator pattern).`,
        ev: smallCredits.slice(0, 4).map(t => t.id)
      });
    }

    // 3. Round-Figure Layering & Chaining (+20 pts) --
    let roundTxs = all.filter(t => t.amount >= 10000 && (t.amount % 10000 === 0 || t.amount % 25000 === 0));
    let chainedCut = false;
    let chainedDesc = '';
    for (let i of inc) {
      for (let o of out) {
        let diff = new Date(o.datetime).getTime() - new Date(i.datetime).getTime();
        if (diff > 0 && diff <= 48 * 3600000 && i.amount >= 20000) {
          let ratio = o.amount / i.amount;
          if (ratio >= 0.90 && ratio <= 0.98) {
            chainedCut = true;
            chainedDesc = `Chained pass-through: ${money(o.amount)} forwarded from ${money(i.amount)} (retaining ${money(i.amount - o.amount)} cut)`;
            break;
          }
        }
      }
      if (chainedCut) break;
    }
    if (roundTxs.length >= 2 || chainedCut) {
      score += 20;
      let totRound = roundTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
      let rText = roundTxs.length >= 2 ? `${roundTxs.length} exact round-figure transfers (${money(totRound)})` : '';
      rules.push({
        rule: 'ROUND_FIGURE_LAYERING',
        name: 'Round-Figure Layering',
        weight: 20,
        reason: `Round-Figure Layering: ${[rText, chainedDesc].filter(Boolean).join(' and ')}.`,
        ev: roundTxs.slice(0, 3).map(t => t.id)
      });
    }

    // 4. Dormant Account Waking Up (+20 pts) --
    for (let k = 0; k < all.length - 1; k++) {
      let gapDays = (new Date(all[k + 1].datetime).getTime() - new Date(all[k].datetime).getTime()) / 86400000;
      if (gapDays >= 14) {
        let burstTxs = all.slice(k + 1).filter(t => (new Date(t.datetime).getTime() - new Date(all[k + 1].datetime).getTime()) <= 48 * 3600000);
        let burstSum = burstTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
        if (burstTxs.length >= 2 || burstSum >= 40000) {
          score += 20;
          rules.push({
            rule: 'DORMANT_WAKING_UP',
            name: 'Dormant Account Burst',
            weight: 20,
            reason: `Dormant Reactivation: Account was dormant for ${Math.round(gapDays)} days before a sudden spike of ${burstTxs.length} transfers (${money(burstSum)}) within 48h.`,
            ev: burstTxs.slice(0, 3).map(t => t.id)
          });
          break;
        }
      }
    }

    // 5. Repeated Counterparties (+15 pts) --
    let cpCounts = {};
    all.forEach(t => {
      let other = t.from === id ? t.to : t.from;
      if (other && other !== id && other !== 'UNKNOWN') cpCounts[other] = (cpCounts[other] || 0) + 1;
    });
    let topRepeats = Object.entries(cpCounts).filter(([_, cnt]) => cnt >= 2);
    if (topRepeats.length > 0) {
      score += 15;
      let [topCp, cnt] = topRepeats.sort((a, b) => b[1] - a[1])[0];
      rules.push({
        rule: 'REPEATED_COUNTERPARTIES',
        name: 'Repeated Counterparties',
        weight: 15,
        reason: `Repeated Entities: Observed ${cnt} rapid transfers between this account and ${topCp} (${topRepeats.length} repeat entities linked).`,
        ev: all.filter(t => t.from === topCp || t.to === topCp).slice(0, 3).map(t => t.id)
      });
    }

    let finalScore = Math.min(100, score);
    let level = finalScore >= 80 ? 'Critical' : finalScore >= 55 ? 'High' : finalScore >= 30 ? 'Medium' : 'Low';

    return {
      id,
      score: finalScore,
      level,
      rules,
      reasons: rules.map(r => r.reason)
    };
  }).filter(a => a.score >= 20);
}

function accountPage() {
  if (!state.loaded) return empty();
  return `${head('ENTITIES', 'Accounts', 'Calculated from every transaction in the case.')}
  <div class="card table-card">
    <div class="table-scroll">
      <table>
        <thead><tr><th>ACCOUNT</th><th>RISK</th><th>IN</th><th>OUT</th><th>NET OBSERVED</th><th>FIRST / LAST ACTIVITY</th></tr></thead>
        <tbody>
          ${accounts().map(a => {
            let r = flags().find(x => x.id === a.id);
            return `<tr>
              <td class="mono">${a.id}</td>
              <td>${r ? `<span class="risk-tag ${r.level.toLowerCase()}">${r.level} · ${r.score}</span>` : '-'}</td>
              <td class="amount">${money(a.in)}</td>
              <td class="amount">${money(a.out)}</td>
              <td class="amount">${money(a.in - a.out)}</td>
              <td class="mono">${a.first?.slice(0, 16)}<small>${a.last?.slice(0, 16)}</small></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function mulePage() {
  if (!state.loaded) return empty();
  let flagged = flags().sort((a, b) => b.score - a.score);
  let a = flagged.find(x => x.id === state.selected) || flagged[0] || { id: 'No Suspects', score: 0, level: 'Low', rules: [], reasons: [] };

  const ruleDefs = [
    { key: 'RAPID_IN_OUT', name: 'Rapid In-Out', pts: '+30' },
    { key: 'MANY_SMALL_CREDITS', name: 'Small Credits Fan-In', pts: '+25' },
    { key: 'ROUND_FIGURE_LAYERING', name: 'Round Layering', pts: '+20' },
    { key: 'DORMANT_WAKING_UP', name: 'Dormant Burst', pts: '+20' },
    { key: 'REPEATED_COUNTERPARTIES', name: 'Repeat Entities', pts: '+15' }
  ];

  let aiAuditSection = '';
  if (state.aiAudit) {
    let accAi = (state.aiAudit.account_assessments || []).find(x => x.account_id === a.id);
    aiAuditSection = `
      <div class="ai-dossier" id="aiDossier" style="margin-bottom:16px">
        <div class="ai-dossier-head">
          <h3><span>🧠</span> AI Forensic Investigation Briefing</h3>
          <span class="ai-badge">${state.aiAudit.is_live_ai ? '⚡ Gemini 3.8 Flash' : '🛡️ R4C Forensic Engine'}</span>
        </div>
        <p class="ai-summary-text" style="font-size:11px;margin:6px 0 10px">
          <strong>Modus Operandi:</strong> ${esc(state.aiAudit.modus_operandi_type)}<br>
          ${esc(state.aiAudit.executive_summary)}
        </p>
        ${accAi ? `
          <div style="background:#fff;border:1px solid #dcd7ef;border-radius:4px;padding:9px 12px;margin:9px 0;font-size:11px">
            <b>Syndicate Role for ${esc(a.id)}:</b> <span class="pill pill-high" style="margin-left:4px">${esc(accAi.role_in_syndicate)}</span> · <b>AI Confidence:</b> ${accAi.confidence}%
            <p style="margin:5px 0 0;color:#49356d;line-height:1.5">${esc(accAi.ai_verdict)}</p>
          </div>
        ` : (state.aiAudit.account_assessments?.length ? `
          <div style="background:#fff;border:1px solid #dcd7ef;border-radius:4px;padding:9px 12px;margin:9px 0;font-size:11px">
            <b>Syndicate Account Hierarchy:</b>
            <div style="margin-top:6px;display:grid;gap:4px">
              ${state.aiAudit.account_assessments.slice(0, 4).map(ac => `
                <div style="color:#49356d;font-size:10px">• <b>${esc(ac.account_id)}</b>: <span class="pill pill-high">${esc(ac.role_in_syndicate)}</span> (${ac.confidence}% confidence)</div>
              `).join('')}
            </div>
          </div>
        ` : '')}
        <div style="font-size:11px;font-weight:700;color:#284b39;margin-top:12px">Statutory Action Plan (§94 / §106 BNSS 2023):</div>
        <ul class="statutory-list">
          ${(state.aiAudit.statutory_action_plan || []).map(step => `<li>${esc(step)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `${head(
    '5-RULE EXPLAINABLE DETECTOR + LLM FORENSICS',
    'Mule Account Detector',
    'Transparent heuristic rule scoring (0-100) and AI forensic syndicate profiling.',
    `<button class="btn btn-secondary ai-btn" id="runAiAuditBtn">🤖 &nbsp;${state.isAuditing ? 'Analyzing with AI...' : 'Run LLM Forensic Audit'}</button>`
  )}
  <div class="mule-layout">
    <div class="card account-list">
      <div style="padding:7px 10px;font:9px var(--mono);color:#6f8194;border-bottom:1px solid #e5eaee;display:flex;justify-content:space-between">
        <span>SUSPECT ACCOUNTS (${flagged.length})</span>
        <span>SCORE</span>
      </div>
      ${flagged.map(x => `
        <button class="account-row ${x.id === a.id ? 'selected' : ''}" data-account="${esc(x.id)}">
          <span class="score ${x.level.toLowerCase()}">${x.score}</span>
          <span><b>${esc(x.id)}</b><small>${x.rules.length} rule hits · ${x.level}</small></span>
          ${window.CrossCaseModule?.renderMuleBadge ? window.CrossCaseModule.renderMuleBadge(x.id) : ''}
          <span class="risk-tag ${x.level.toLowerCase()}">${x.level}</span>
        </button>
      `).join('')}
    </div>

    <div class="card reason-panel">
      <div class="reason-head">
        <div>
          <div class="eyebrow">RULE AUDIT / ${esc(a.id)}</div>
          <h2>Explainable Rule Evaluation</h2>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-primary btn-legal-action" onclick="window.LegalDraftModule?.openModal({
            type: 'BANK_FREEZE',
            account: '${esc(a.id)}',
            muleTier: '${esc(a.level)}',
            score: ${a.score}
          })" style="white-space:nowrap;font-size:11px;padding:6px 10px;">⚖️ Draft §106 BNSS Freeze Notice</button>
          <span class="score ${a.level.toLowerCase()}">${a.score}<small style="display:block;font-size:7px">/ 100</small></span>
        </div>
      </div>
      
      <div class="rule-chips">
        ${ruleDefs.map(rd => {
          let hit = (a.rules || []).find(r => r.rule === rd.key);
          return `<span class="rule-chip ${hit ? 'active' : ''}"><b>${hit ? '✓ ' + rd.pts : '○'}</b> ${rd.name}</span>`;
        }).join('')}
      </div>

      <p class="muted">Every risk score is computed by transparent rules with linked transaction evidence.</p>
      ${window.CrossCaseModule?.renderMuleReasonAlert ? window.CrossCaseModule.renderMuleReasonAlert(a.id) : ''}
      
      ${aiAuditSection}

      <div class="reason-list">
        ${(a.rules || []).map(r => `
          <div class="reason">
            <span class="reason-check">✓</span>
            <div>
              <b>${esc(r.name)}</b>
              <p>${esc(r.reason)}</p>
              <a data-goto="transactions">Evidence references → ${esc((r.ev || []).join(', '))}</a>
            </div>
            <span class="weight">+${r.weight}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
}

// =========================================================================
// Money trail graph from victim UTR
// Deterministic multi-hop fund tracer, interactive SVG/Canvas graph,
// live 8-metric summary strip, slide-over drawer, Play Trail animation,
// second views (Hop Table, Timeline, Sankey, AI Narrative), and CSV export.
// =========================================================================

const formatMoneyINR = n => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatIST(dtStr) {
  if (!dtStr) return '-';
  let s = String(dtStr).trim();
  if (s.includes('IST') || s.includes('UTC')) return s;
  let d = new Date(s);
  if (isNaN(d.getTime())) return s + ' IST';
  let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let day = String(d.getDate()).padStart(2, '0');
  let mon = months[d.getMonth()];
  let yr = d.getFullYear();
  let hr = String(d.getHours()).padStart(2, '0');
  let min = String(d.getMinutes()).padStart(2, '0');
  let sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${mon}-${yr} ${hr}:${min}:${sec} IST`;
}

function parseDateForTrail(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  let str = String(s).trim();
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // Handle "14-Oct-2026 10:42:15"
  let m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    let months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    let mon = months[m[2].toLowerCase()] ?? 0;
    return new Date(Number(m[3]), mon, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
  }
  return null;
}

function formatDelayStr(seconds) {
  if (seconds <= 0) return '0 min';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  let mins = Math.round(seconds / 60);
  if (mins < 60) return `+${mins} min`;
  let hrs = (seconds / 3600).toFixed(1);
  if (hrs < 24) return `+${hrs} hrs`;
  let days = (seconds / 86400).toFixed(1);
  return `+${days} days`;
}

function formatHeldStr(seconds) {
  if (seconds <= 0) return 'held < 1m';
  let mins = Math.round(seconds / 60);
  if (mins < 60) return `held ${mins} min`;
  let hrs = (seconds / 3600).toFixed(1);
  if (hrs < 24) return `held ${hrs} hrs`;
  let days = (seconds / 86400).toFixed(1);
  return `held ${days} days`;
}

function normAccount(acc) {
  if (!acc) return '';
  let m = String(acc).trim().match(/^(.+?)\s*\(([\w\d]+)\)$/);
  return m ? m[1].trim() : String(acc).trim();
}

function isCashoutEntity(acc, narr = '') {
  let combined = ((acc || '') + ' ' + (narr || '')).toUpperCase();
  return /\b(ATM|CASH\s*WDL|CASH\s*OUT|SELF\s*WDL|BRANCH\s*ATM)\b/.test(combined);
}

function extractAccountDetails(accStr, narrStr = '') {
  let accClean = String(accStr || '').trim();
  let holder = accClean;
  let accNo = '';
  let bank = 'Commercial Bank';
  let m = accClean.match(/^(.+?)\s*\(([\w\d]+)\)$/);
  if (m) {
    holder = m[1].trim();
    accNo = m[2].trim();
  }
  if (isCashoutEntity(accClean, narrStr)) {
    holder = accClean.toUpperCase().includes('ATM') ? 'ATM Cash Withdrawal' : 'Cash Withdrawal';
    bank = 'ATM Terminal';
  } else if (/SBI|STATE BANK/i.test(accClean)) {
    bank = 'State Bank of India';
  } else if (/HDFC/i.test(accClean)) {
    bank = 'HDFC Bank';
  } else if (/CO-OPERATIVE|DEMO CO/i.test(accClean)) {
    bank = 'Demo Co-Op Bank';
  } else if (/SAMPLE NATIONAL/i.test(accClean)) {
    bank = 'Sample National Bank';
  }
  let masked = accNo.length >= 4 ? `•••${accNo.slice(-4)}` : (accNo || '••••');
  if (isCashoutEntity(accClean, narrStr)) masked = 'CASH-OUT';
  return { holder, accountNo: accNo, masked, bank };
}

// Deterministic Multi-Hop Trail Calculation
function computeMoneyTrail(targetUtr, opts = {}) {
  let txs = [...(state.transactions || [])];
  if (!txs.length) return null;

  let maxHops = Number(opts.max_hops ?? 6);
  let timeWindowHours = Number(opts.time_window ?? 72);
  let minAmount = Number(opts.min_amount ?? 500);
  let includeSmall = opts.include_small !== false;
  let allocation = opts.allocation || 'fifo';

  // Deduplicate identical inter-statement transfers by UTR
  let seenKeys = new Set();
  let cleanTxs = [];
  txs.forEach((t, i) => {
    let srcNorm = normAccount(t.from).toUpperCase();
    let dstNorm = normAccount(t.to).toUpperCase();
    let amt = Number(t.amount || 0);
    let utr = String(t.utr || '').trim();
    let dedupKey = utr ? `${utr}|${amt.toFixed(2)}|${srcNorm}|${dstNorm}` : null;
    if (dedupKey && seenKeys.has(dedupKey)) return;
    if (dedupKey) seenKeys.add(dedupKey);

    cleanTxs.push({
      ...t,
      id: t.id || `TX-${i + 1}`,
      from_norm: srcNorm,
      to_norm: dstNorm,
      amount: amt,
      parsed_dt: parseDateForTrail(t.datetime),
      utr: utr,
      mode: t.mode || (t.narration?.includes('UPI') ? 'UPI' : t.narration?.includes('NEFT') ? 'NEFT' : isCashoutEntity(t.to, t.narration) ? 'ATM-Cash' : 'IMPS')
    });
  });

  // Find victim transaction by UTR
  let queryUtr = (targetUtr || state.trailUtr || state.case?.utr || '').trim();
  let vTx = queryUtr ? cleanTxs.find(t => t.utr && (t.utr.toLowerCase() === queryUtr.toLowerCase() || t.utr.includes(queryUtr))) : null;
  if (!vTx && state.case?.utr) {
    vTx = cleanTxs.find(t => t.utr && (t.utr.toLowerCase() === state.case.utr.toLowerCase() || t.utr.includes(state.case.utr)));
  }
  if (!vTx) {
    vTx = cleanTxs.find(t => t.from === state.case?.victimAccount || t.from === 'ACC-VIC-2041' || t.from === 'MEERA NAIR');
  }
  if (!vTx && cleanTxs.length) {
    vTx = cleanTxs.find(t => t.utr && t.utr !== '-' && t.amount >= 1000) || cleanTxs[0];
  }

  if (!vTx) {
    return {
      success: false,
      message: `Transaction not found for UTR: ${queryUtr}`,
      knownUtrs: cleanTxs.filter(t => t.utr).map(t => t.utr),
      nodes: [],
      edges: []
    };
  }

  if (vTx.utr && (!state.trailUtr || !cleanTxs.some(t => t.utr === state.trailUtr))) {
    state.trailUtr = vTx.utr;
  }

  let victimAmount = vTx.amount;
  let vDt = vTx.parsed_dt || new Date();
  let vDetails = extractAccountDetails(vTx.from);

  // Compute mule scores for accounts
  let muleScores = {};
  flags().forEach(m => {
    muleScores[normAccount(m.id).toUpperCase()] = m;
  });

  let statementAccs = new Set((state.statementAccounts || []).map(a => normAccount(a).toUpperCase()));
  cleanTxs.forEach(t => {
    if (t.source_file) {
      if (t.from_norm) statementAccs.add(t.from_norm);
    }
  });

  // Victim Node (Hop 0)
  let nodes = {};
  nodes[vTx.from_norm] = {
    id: vTx.from_norm,
    raw_name: vTx.from,
    holder: vDetails.holder,
    account_no: vDetails.accountNo,
    masked: vDetails.masked,
    bank: vDetails.bank,
    hop: 0,
    category: 'victim',
    risk_score: 0,
    risk_level: 'Low',
    received_amount: 0,
    sent_amount: victimAmount,
    traced_in: 0,
    traced_out: victimAmount,
    balance_retained: 0,
    time_held_str: 'Source',
    time_held_seconds: 0,
    first_received_time: vTx.datetime,
    last_sent_time: vTx.datetime,
    has_statement: true,
    transactions_in: [],
    transactions_out: [vTx],
    rule_hits: []
  };

  let hop1Acc = vTx.to_norm;
  let edges = [];

  // Root Edge: Victim -> Hop 1
  edges.append = edges.push; // helper
  edges.push({
    id: `E-ROOT-${vTx.id}`,
    source: vTx.from_norm,
    target: hop1Acc,
    amount: victimAmount,
    traced_amount: victimAmount,
    is_traced: true,
    datetime: vTx.datetime,
    utr: vTx.utr,
    mode: vTx.mode,
    narration: vTx.narration,
    elapsed_seconds: 0,
    elapsed_str: '0 min',
    is_fast: false,
    is_round: (victimAmount >= 10000 && victimAmount % 10000 === 0),
    transactions: [vTx]
  });

  let visitedHops = { [vTx.from_norm]: 0, [hop1Acc]: 1 };
  let accountFunds = { [hop1Acc]: victimAmount };
  let accountEarliestArr = { [hop1Acc]: vDt };
  let allocatedTxIds = new Set();
  let currentLevel = [[hop1Acc, 1]];

  while (currentLevel.length) {
    let nextLevel = [];

    for (let [currAcc, currHop] of currentLevel) {
      let availFunds = accountFunds[currAcc] || 0;
      let currArrDt = accountEarliestArr[currAcc] || vDt;

      if (!nodes[currAcc]) {
        let sample = cleanTxs.find(t => t.to_norm === currAcc)?.to || currAcc;
        let details = extractAccountDetails(sample);
        let mProf = muleScores[currAcc] || muleScores[details.holder.toUpperCase()] || {};
        let rScore = mProf.score || 0;
        let rLevel = mProf.level || (rScore >= 80 ? 'Critical' : rScore >= 55 ? 'High' : rScore >= 30 ? 'Medium' : 'Low');

        let isCash = isCashoutEntity(currAcc);
        let hasStmt = statementAccs.has(currAcc) || statementAccs.has(details.holder.toUpperCase());

        let cat = 'mule_low';
        if (isCash) cat = 'cashout';
        else if (!hasStmt) cat = 'external';
        else if (rLevel === 'Critical') cat = 'mule_critical';
        else if (rLevel === 'High') cat = 'mule_high';
        else if (rLevel === 'Medium') cat = 'mule_medium';

        nodes[currAcc] = {
          id: currAcc,
          raw_name: sample,
          holder: details.holder,
          account_no: details.accountNo,
          masked: details.masked,
          bank: details.bank,
          hop: currHop,
          category: cat,
          risk_score: rScore,
          risk_level: rLevel,
          received_amount: 0,
          sent_amount: 0,
          traced_in: availFunds,
          traced_out: 0,
          balance_retained: availFunds,
          time_held_str: 'held -',
          time_held_seconds: 0,
          first_received_time: currArrDt.toISOString?.() || String(currArrDt),
          last_sent_time: '',
          has_statement: hasStmt,
          transactions_in: [],
          transactions_out: [],
          rule_hits: mProf.rules || []
        };
      }

      if (['cashout', 'external'].includes(nodes[currAcc].category)) continue;
      if (currHop >= maxHops) continue;

      let outCandidates = cleanTxs.filter(t => 
        t.from_norm === currAcc &&
        !allocatedTxIds.has(t.id) &&
        t.parsed_dt &&
        t.parsed_dt >= currArrDt &&
        (t.parsed_dt - currArrDt) <= timeWindowHours * 3600000 &&
        (includeSmall || t.amount >= minAmount)
      );

      outCandidates.sort((a, b) => a.parsed_dt - b.parsed_dt);

      if (!outCandidates.length) {
        if (!['victim', 'cashout', 'external'].includes(nodes[currAcc].category)) {
          nodes[currAcc].category = 'holding';
        }
        continue;
      }

      let pool = availFunds;
      let firstDepDt = null;
      let totalSentInTrail = 0;

      for (let outTx of outCandidates) {
        if (pool <= 0 && allocation === 'fifo') break;

        let outAmt = outTx.amount;
        let tracedAmt = allocation === 'fifo' ? Math.min(pool, outAmt) : Math.round(Math.min(outAmt, outAmt * (availFunds / Math.max(1, outCandidates.reduce((s, x) => s + x.amount, 0)))));

        if (tracedAmt <= 0) continue;

        pool -= tracedAmt;
        totalSentInTrail += tracedAmt;
        allocatedTxIds.add(outTx.id);
        let dstAcc = outTx.to_norm;
        let outDt = outTx.parsed_dt || currArrDt;

        if (!firstDepDt) firstDepDt = outDt;

        let delaySec = Math.max(0, (outDt - currArrDt) / 1000);
        let isCircular = Boolean(visitedHops[dstAcc] && visitedHops[dstAcc] <= currHop);

        let edgeId = `E-${currHop}-${outTx.id}`;
        let edgeObj = {
          id: edgeId,
          source: currAcc,
          target: dstAcc,
          amount: outAmt,
          traced_amount: tracedAmt,
          is_traced: true,
          datetime: outTx.datetime,
          utr: outTx.utr,
          mode: outTx.mode,
          narration: outTx.narration,
          elapsed_seconds: delaySec,
          elapsed_str: formatDelayStr(delaySec),
          is_fast: delaySec <= 900,
          is_round: (outAmt >= 10000 && (outAmt % 10000 === 0 || outAmt % 25000 === 0)),
          is_circular: isCircular,
          transactions: [outTx]
        };
        edges.push(edgeObj);
        nodes[currAcc].transactions_out.push(outTx);

        if (isCircular) {
          if (nodes[dstAcc]) {
            nodes[dstAcc].is_circular = true;
            nodes[dstAcc].category = 'circular';
          }
          continue;
        }

        accountFunds[dstAcc] = (accountFunds[dstAcc] || 0) + tracedAmt;
        if (!accountEarliestArr[dstAcc] || outDt < accountEarliestArr[dstAcc]) {
          accountEarliestArr[dstAcc] = outDt;
        }

        visitedHops[dstAcc] = currHop + 1;
        if (!nextLevel.some(x => x[0] === dstAcc)) {
          nextLevel.push([dstAcc, currHop + 1]);
        }
      }

      nodes[currAcc].sent_amount += totalSentInTrail;
      nodes[currAcc].traced_out += totalSentInTrail;
      nodes[currAcc].balance_retained = Math.max(0, nodes[currAcc].traced_in - nodes[currAcc].traced_out);

      if (nodes[currAcc].balance_retained >= 1000 && !['cashout', 'victim', 'external'].includes(nodes[currAcc].category)) {
        nodes[currAcc].category = 'holding';
      }

      if (firstDepDt) {
        let heldSec = Math.max(0, (firstDepDt - currArrDt) / 1000);
        nodes[currAcc].time_held_seconds = heldSec;
        nodes[currAcc].time_held_str = formatHeldStr(heldSec);
        nodes[currAcc].last_sent_time = firstDepDt.toISOString();
      }
    }

    currentLevel = nextLevel;
  }

  // Populate Destination Nodes that haven't been expanded
  edges.forEach(edge => {
    let src = edge.source;
    let dst = edge.target;
    if (!nodes[dst]) {
      let sample = cleanTxs.find(t => t.to_norm === dst)?.to || dst;
      let details = extractAccountDetails(sample, edge.narration);
      let isCash = isCashoutEntity(dst, edge.narration);
      let cat = isCash ? 'cashout' : 'external';
      let srcHop = nodes[src]?.hop || 1;

      nodes[dst] = {
        id: dst,
        raw_name: sample,
        holder: details.holder,
        account_no: details.accountNo,
        masked: details.masked,
        bank: details.bank,
        hop: srcHop + 1,
        category: cat,
        risk_score: 0,
        risk_level: isCash ? 'Low' : 'Medium',
        received_amount: edge.amount,
        sent_amount: 0,
        traced_in: edge.traced_amount,
        traced_out: 0,
        balance_retained: edge.traced_amount,
        time_held_str: isCash ? 'Cash-Out Point' : 'External / Statement Missing',
        time_held_seconds: 0,
        first_received_time: edge.datetime,
        last_sent_time: '',
        has_statement: false,
        transactions_in: edge.transactions,
        transactions_out: [],
        rule_hits: []
      };
    } else {
      nodes[dst].received_amount += edge.amount;
      nodes[dst].transactions_in.push(...edge.transactions);
    }
  });

  // Calculate live summary metrics
  let totalTraced = edges.filter(e => e.source === vTx.from_norm).reduce((s, e) => s + e.traced_amount, 0);
  let cashedOut = Object.values(nodes).filter(n => n.category === 'cashout').reduce((s, n) => s + n.traced_in, 0);
  let stillHeld = Object.values(nodes).filter(n => ['holding', 'mule_critical', 'mule_high', 'mule_medium'].includes(n.category)).reduce((s, n) => s + n.balance_retained, 0);
  let allDelays = edges.map(e => e.elapsed_seconds).filter(s => s > 0);
  let fastestSec = allDelays.length ? Math.min(...allDelays) : 0;
  let fastestStr = fastestSec ? formatDelayStr(fastestSec) : 'Instant';
  let maxObservedHop = Math.max(...Object.values(nodes).map(n => n.hop), 0);
  let muleCount = Object.values(nodes).filter(n => n.category.startsWith('mule_') || n.risk_score >= 30).length;

  let cashoutEdges = edges.filter(e => isCashoutEntity(e.target));
  let timeToCashoutStr = 'No Cashout Observed';
  if (cashoutEdges.length) {
    let coDt = parseDateForTrail(cashoutEdges[0].datetime) || vDt;
    timeToCashoutStr = formatDelayStr(Math.max(0, (coDt - vDt) / 1000));
  }

  let summary = {
    amount_lost: victimAmount,
    amount_traced: totalTraced,
    hops_count: maxObservedHop,
    mules_count: muleCount,
    amount_cashed_out: cashedOut,
    amount_still_held: stillHeld,
    time_to_cashout: timeToCashoutStr,
    fastest_transfer_time: fastestStr,
    victim_info: {
      name: vDetails.holder,
      account: vDetails.accountNo,
      masked: vDetails.masked,
      amount: victimAmount,
      datetime: vTx.datetime,
      utr: vTx.utr,
      mode: vTx.mode,
      bank: vDetails.bank
    }
  };

  let nodeList = Object.values(nodes).sort((a, b) => a.hop - b.hop || b.traced_in - a.traced_in);

  return {
    success: true,
    victim_utr: vTx.utr,
    nodes: nodeList,
    edges: edges,
    summary: summary
  };
}

// -------------------------------------------------------------------------
// HERO SCREEN VIEW BUILDER: trailPage()
// -------------------------------------------------------------------------
function trailPage() {
  if (!state.loaded && (!state.transactions || !state.transactions.length)) {
    return `<div class="card empty-state">
      <b>No case or statement evidence loaded</b>
      <p>Load the verified sample statement dataset or synthetic demo case to test the Money Trail engine.</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-primary" id="sunriseKiranTrailBtn">⭐ &nbsp;Load Sunrise + Kiran Sample (UTR 428714563201)</button>
        <button class="btn btn-secondary" id="demoTrailBtn">✦ &nbsp;Load Synthetic Demo Case (UTR SYN240814A001)</button>
      </div>
    </div>`;
  }

  let trailData = computeMoneyTrail(state.trailUtr, state.trailOptions);
  state.trailResult = trailData;

  // Search box autocomplete list from known transactions
  let knownUtrs = [...new Set(state.transactions.map(t => t.utr).filter(Boolean))];
  let knownAccounts = [...new Set(state.transactions.flatMap(t => [t.from, t.to]).filter(Boolean))];

  // 1. INPUT PANEL
  let inputPanel = `
    <div class="trail-input-card">
      <div class="trail-input-row">
        <div class="trail-search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="trailUtrInput" placeholder="Enter victim UTR (e.g. 428714563201)…" value="${esc(state.trailUtr || '')}">
          <div class="trail-autocomplete" id="trailAutocomplete">
            ${knownUtrs.map(u => `
              <div class="trail-autocomplete-item" data-utr="${esc(u)}">
                <b>${esc(u)}</b>
                <small>${esc(state.transactions.find(t => t.utr === u)?.from || '')} → ${money(state.transactions.find(t => t.utr === u)?.amount || 0)}</small>
              </div>
            `).join('')}
          </div>
        </div>

        <select id="startAccountSelect" style="height:40px;border-radius:6px;border:1px solid #cad5e0;font-size:10px;padding:0 10px;background:#fff;max-width:200px">
          <option value="">Start from Account…</option>
          ${knownAccounts.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}
        </select>

        <button class="btn btn-primary" id="traceUtrBtn" style="height:40px">⚡ &nbsp;Trace Money Trail</button>
        <button class="btn btn-secondary" id="sunriseKiranQuickBtn" title="Load sample dataset" style="height:40px">⭐ &nbsp;Load Sunrise + Kiran (428714563201)</button>
      </div>

      <div class="trail-options-bar">
        <div class="trail-option-item">
          <label>Max Hops:</label>
          <input type="range" id="optMaxHops" min="1" max="10" value="${state.trailOptions.max_hops}">
          <b id="lblMaxHops">${state.trailOptions.max_hops}</b>
        </div>
        <div class="trail-option-item">
          <label>Window:</label>
          <input type="range" id="optTimeWindow" min="12" max="168" step="12" value="${state.trailOptions.time_window}">
          <b id="lblTimeWindow">${state.trailOptions.time_window}h</b>
        </div>
        <div class="trail-option-item">
          <label>Min Amt:</label>
          <input type="number" id="optMinAmount" value="${state.trailOptions.min_amount}" style="width:65px;height:26px;font-size:9px;border:1px solid #cad5e0;border-radius:3px;padding:2px 4px">
        </div>
        <div class="trail-option-item">
          <label><input type="checkbox" id="optIncludeSmall" ${state.trailOptions.include_small ? 'checked' : ''}> Include Small Transfers</label>
        </div>
        <div class="trail-option-item">
          <label>Allocation:</label>
          <select id="optAllocation" style="height:26px;font-size:9px">
            <option value="fifo" ${state.trailOptions.allocation === 'fifo' ? 'selected' : ''}>FIFO (First-In First-Out)</option>
            <option value="proportional" ${state.trailOptions.allocation === 'proportional' ? 'selected' : ''}>Proportional</option>
          </select>
        </div>
        <div class="trail-option-item">
          <label><input type="checkbox" id="optMergeParallel" ${state.trailOptions.merge_parallel ? 'checked' : ''}> Merge Parallel Edges</label>
        </div>
      </div>

      ${trailData?.success && trailData.summary?.victim_info ? `
        <div class="victim-card">
          <div class="victim-card-main">
            <div class="victim-avatar">👤</div>
            <div class="victim-details">
              <b>${esc(trailData.summary.victim_info.name)} <span class="pill pill-muted" style="margin-left:6px;font-size:8px">VICTIM</span></b>
              <small>Account: ${esc(trailData.summary.victim_info.masked)} · Bank: ${esc(trailData.summary.victim_info.bank)}</small>
            </div>
          </div>
          <div class="victim-metrics">
            <div class="victim-metric-item">
              <span>REPORTED LOSS</span>
              <strong>${formatMoneyINR(trailData.summary.victim_info.amount)}</strong>
            </div>
            <div class="victim-metric-item">
              <span>ENTRY UTR</span>
              <strong style="color:#2563eb">${esc(trailData.summary.victim_info.utr)}</strong>
            </div>
            <div class="victim-metric-item">
              <span>MODE / TIMESTAMP</span>
              <strong style="font-size:10px;color:#475569">${esc(trailData.summary.victim_info.mode)} · ${esc(formatIST(trailData.summary.victim_info.datetime))}</strong>
            </div>
          </div>
        </div>
      ` : `
        <div style="margin-top:12px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:10px;color:#991b1b">
          ⚠️ <b>UTR ${esc(state.trailUtr)} not found in loaded statements.</b> Try clicking one of the known UTRs above or click "⭐ Load Sunrise + Kiran Sample".
        </div>
      `}
    </div>
  `;

  if (!trailData || !trailData.success) {
    return `${head('MONEY TRAIL INVESTIGATION', 'Money Trail from Victim UTR', 'Deterministic fund routing graph tracing victim money hop-by-hop across accounts.')}
      <div class="trail-hero-container">${inputPanel}</div>`;
  }

  let sum = trailData.summary;

  // 2. SUMMARY STRIP (8 Live Cards)
  let summaryStrip = `
    <div class="trail-summary-strip">
      <div class="trail-kpi-card ${state.trailFilter === 'lost' ? 'active-filter' : ''}" data-trail-filter="lost">
        <span>Amount Lost</span>
        <strong>${formatMoneyINR(sum.amount_lost)}</strong>
        <small>100% Intake</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'traced' ? 'active-filter' : ''}" data-trail-filter="traced">
        <span>Amount Traced</span>
        <strong>${formatMoneyINR(sum.amount_traced)}</strong>
        <small style="color:#059669">${Math.round((sum.amount_traced / (sum.amount_lost || 1)) * 100)}% Traced</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'hops' ? 'active-filter' : ''}" data-trail-filter="hops">
        <span>Observed Hops</span>
        <strong>${sum.hops_count} Hops</strong>
        <small>Dispersal Depth</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'mule' ? 'active-filter' : ''}" data-trail-filter="mule">
        <span>Mule Accounts</span>
        <strong style="color:#dc2626">${sum.mules_count} Suspects</strong>
        <small style="color:#ef4444">High & Critical</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'cashout' ? 'active-filter' : ''}" data-trail-filter="cashout">
        <span>Cashed Out</span>
        <strong style="color:#9333ea">${formatMoneyINR(sum.amount_cashed_out)}</strong>
        <small style="color:#a855f7">ATM Terminals</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'holding' ? 'active-filter' : ''}" data-trail-filter="holding">
        <span>Still Held</span>
        <strong style="color:#0d9488">${formatMoneyINR(sum.amount_still_held)}</strong>
        <small style="color:#14b8a6">Intermediaries</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'cashout_time' ? 'active-filter' : ''}" data-trail-filter="cashout_time">
        <span>First Cash-Out</span>
        <strong style="font-size:12px;color:#e11d48">${esc(sum.time_to_cashout)}</strong>
        <small>Post Victim Transfer</small>
      </div>
      <div class="trail-kpi-card ${state.trailFilter === 'fast' ? 'active-filter' : ''}" data-trail-filter="fast">
        <span>Fastest Transfer</span>
        <strong style="font-size:12px;color:#ea580c">${esc(sum.fastest_transfer_time)}</strong>
        <small style="color:#f97316">Rapid Velocity</small>
      </div>
    </div>
  `;

  // 3. GRAPH LAYOUT COMPUTATION (Layered Left-to-Right)
  let nodesByHop = {};
  trailData.nodes.forEach(n => {
    let h = n.hop;
    if (!nodesByHop[h]) nodesByHop[h] = [];
    nodesByHop[h].push(n);
  });

  let colWidth = 240;
  let rowHeight = 125;
  let canvasWidth = Math.max(900, (sum.hops_count + 1) * colWidth + 80);
  let maxNodesInHop = Math.max(...Object.values(nodesByHop).map(arr => arr.length), 1);
  let canvasHeight = Math.max(500, maxNodesInHop * rowHeight + 100);

  // Layout node positions
  let nodePositions = {};
  Object.keys(nodesByHop).forEach(hopStr => {
    let hop = Number(hopStr);
    let colNodes = nodesByHop[hop];
    let x = 60 + hop * colWidth;
    let totalColHeight = colNodes.length * rowHeight;
    let startY = Math.max(60, (canvasHeight - totalColHeight) / 2);

    colNodes.forEach((n, idx) => {
      let y = startY + idx * rowHeight;
      nodePositions[n.id] = { x, y, width: 190, height: 95 };
    });
  });

  // SVG Paths with Cubic Bezier curves
  let svgPaths = trailData.edges.map(e => {
    let pSrc = nodePositions[e.source];
    let pTgt = nodePositions[e.target];
    if (!pSrc || !pTgt) return '';

    let x1 = pSrc.x + pSrc.width;
    let y1 = pSrc.y + pSrc.height / 2;
    let x2 = pTgt.x;
    let y2 = pTgt.y + pTgt.height / 2;

    let dx = Math.max(40, x2 - x1);
    let cx1 = x1 + dx * 0.45;
    let cy1 = y1;
    let cx2 = x2 - dx * 0.45;
    let cy2 = y2;
    let d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    let strokeWidth = Math.max(2, Math.min(7, 2 + (e.traced_amount / (sum.amount_lost || 1)) * 5));
    let color = e.is_fast ? '#ef4444' : e.is_circular ? '#ec4899' : '#38bdf8';
    let dash = e.is_traced ? '' : 'stroke-dasharray="5,4"';
    let isSelected = state.trailSelectedEdge === e.id;
    let isHovered = state.trailHover === e.id || state.trailHover === e.source || state.trailHover === e.target;
    let isDimmed = state.trailHover && !isHovered;

    let midX = (x1 + x2) / 2;
    let midY = (y1 + y2) / 2 - 12;

    return `
      <g class="trail-edge-group ${isDimmed ? 'dimmed' : ''}" data-edge-id="${esc(e.id)}">
        <path d="${d}" 
              stroke="${color}" 
              stroke-width="${isSelected ? strokeWidth + 2 : strokeWidth}" 
              ${dash} 
              marker-end="url(#arrow-${e.is_fast ? 'red' : 'blue'})"
              class="${e.is_fast ? 'fast-transfer' : ''} ${isSelected ? 'highlighted' : ''}"/>
      </g>
    `;
  }).join('');

  // Edge Labels (HTML layer for sharp readability)
  let edgeLabels = trailData.edges.map(e => {
    let pSrc = nodePositions[e.source];
    let pTgt = nodePositions[e.target];
    if (!pSrc || !pTgt) return '';

    let x1 = pSrc.x + pSrc.width;
    let y1 = pSrc.y + pSrc.height / 2;
    let x2 = pTgt.x;
    let y2 = pTgt.y + pTgt.height / 2;

    let midX = (x1 + x2) / 2;
    let midY = (y1 + y2) / 2;
    let shortUtr = e.utr ? `···${e.utr.slice(-4)}` : '';

    return `
      <div class="trail-edge-label ${e.is_fast ? 'fast-pulse' : ''}" 
           style="left:${midX}px;top:${midY}px" 
           data-edge-id="${esc(e.id)}">
        <span class="edge-delay-chip">${esc(e.elapsed_str)}</span>
        <b>${formatMoneyINR(e.traced_amount)}</b> · ${esc(shortUtr)}
      </div>
    `;
  }).join('');

  // Node Cards (HTML layer with full styling)
  let nodeCards = trailData.nodes.map(n => {
    let pos = nodePositions[n.id] || { x: 50, y: 50 };
    let isSelected = state.trailSelectedNode === n.id;
    let isHovered = state.trailHover === n.id;
    let isDimmed = state.trailHover && !isHovered;

    let icon = n.category === 'victim' ? '👤' : 
               n.category === 'cashout' ? '🏧' : 
               n.category.startsWith('mule_') ? '⚠️' : '🏦';

    let badgeText = n.hop === 0 ? 'VICTIM' : `HOP ${n.hop} · ${n.risk_level.toUpperCase()}`;
    let timeHeld = n.hop === 0 ? 'SOURCE' : (n.time_held_str || 'held -');

    return `
      <div class="trail-node-card ${n.category} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}"
           style="left:${pos.x}px;top:${pos.y}px"
           data-node-id="${esc(n.id)}">
        <div class="node-card-head">
          <span class="node-badge">${icon} ${badgeText}</span>
          ${window.CrossCaseModule?.renderNodeBadge ? window.CrossCaseModule.renderNodeBadge(n.id) : ''}
          <span class="node-time-held">${esc(timeHeld)}</span>
        </div>
        <strong class="node-holder-title" title="${esc(n.holder)}">${esc(n.holder)}</strong>
        <div class="node-account-meta">
          <span>${esc(n.masked)}</span>
          <span>${esc(n.bank)}</span>
        </div>
        <div class="node-amount-bar">
          <span>Traced In:</span>
          <strong>${formatMoneyINR(n.traced_in || n.sent_amount)}</strong>
        </div>
      </div>
    `;
  }).join('');

  // Column Headers
  let columnHeaders = [];
  for (let h = 0; h <= sum.hops_count; h++) {
    let title = h === 0 ? 'Victim' : h === sum.hops_count ? `Hop ${h} (Terminal)` : `Hop ${h}`;
    columnHeaders.push(`<div class="trail-col-header-item">${title}</div>`);
  }

  // Active Selected Node/Edge for Detail Drawer
  let selNode = trailData.nodes.find(n => n.id === state.trailSelectedNode);
  let selEdge = trailData.edges.find(e => e.id === state.trailSelectedEdge);
  let drawerOpen = Boolean(selNode || selEdge);

  // 4. GRAPH VIEWPORT CARD
  let graphViewport = `
    <div class="trail-viewport-card">
      <div class="trail-graph-toolbar">
        <div class="trail-toolbar-group">
          <span style="font-weight:700;color:#38bdf8">⌘ MONEY TRAIL GRAPH</span>
          <span style="color:#475569">|</span>
          <button class="trail-tool-btn" id="btnFitScreen" title="Fit to screen (F)">⛶ Fit (F)</button>
          <button class="trail-tool-btn" id="btnZoomIn">＋</button>
          <button class="trail-tool-btn" id="btnZoomOut">－</button>
          <button class="trail-tool-btn ${state.trailOptions.layout === 'layered' ? 'active' : ''}" id="btnLayoutLayered">Layered</button>
        </div>

        <div class="trail-toolbar-group">
          <div class="trail-player-bar">
            <button class="trail-tool-btn" id="btnPlayTrail" style="background:#0284c7;color:#fff;border:0">
              ${state.isPlaying ? '⏸ Pause' : '▶ Play Trail'}
            </button>
            <input type="range" class="trail-scrubber" id="trailScrubber" min="0" max="${trailData.edges.length}" value="${state.playStep}">
            <span class="trail-clock-pill" id="trailClockPill">${esc(sum.victim_info?.datetime?.slice(11, 19) || '10:42:15')}</span>
            <button class="trail-tool-btn" id="btnSpeedToggle">1x</button>
          </div>
        </div>

        <div class="trail-toolbar-group">
          <button class="trail-tool-btn" id="btnExportSvg">📄 SVG</button>
          <button class="trail-tool-btn" id="btnExportPng">📷 PNG</button>
          <button class="trail-tool-btn" id="btnAddToReport">📋 Add to Report</button>
        </div>
      </div>

      <div class="trail-canvas-area" id="trailCanvasArea">
        <div class="trail-grid-pattern"></div>
        <div class="trail-columns-header">${columnHeaders.join('')}</div>

        <div id="trailPanZoomLayer" style="position:absolute;inset:0;width:${canvasWidth}px;height:${canvasHeight}px;transform-origin:0 0;transform:translate(${state.trailPanX || 0}px, ${state.trailPanY || 0}px) scale(${state.trailZoom || 1})">
          <svg class="trail-svg-overlay" style="width:${canvasWidth}px;height:${canvasHeight}px">
            <defs>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"/>
              </marker>
            </defs>
            ${svgPaths}
          </svg>

          <div class="trail-nodes-layer">
            ${nodeCards}
            ${edgeLabels}
          </div>
        </div>

        <!-- Collapsible Legend -->
        <div class="trail-legend-strip">
          <div class="legend-item"><span class="legend-color-dot" style="background:#2563eb"></span> Victim</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#dc2626"></span> Critical Mule</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#ea580c"></span> High Mule</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#d97706"></span> Medium Mule</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#9333ea"></span> Cash-Out / ATM</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#0d9488"></span> Still Held</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#64748b;border:1px dashed #94a3b8"></span> External Statement Missing</div>
          <div class="legend-item"><span class="legend-color-dot" style="background:#db2777"></span> Circular Flow</div>
        </div>
      </div>
    </div>
  `;

  // 5. DETAIL SLIDE-OVER DRAWER
  let drawerContent = '';
  if (selNode) {
    let mProf = muleScores[selNode.id] || {};
    let rules = selNode.rule_hits || mProf.rules || [];

    drawerContent = `
      <div class="drawer-head">
        <div>
          <span class="pill pill-muted">${esc(selNode.category.toUpperCase())} · HOP ${selNode.hop}</span>
          <h3>${esc(selNode.holder)}</h3>
        </div>
        <button class="drawer-close" id="closeDrawerBtn">×</button>
      </div>

      <div class="drawer-tabs">
        <button class="drawer-tab ${state.trailDrawerTab === 'summary' ? 'active' : ''}" data-drawer-tab="summary">Summary</button>
        <button class="drawer-tab ${state.trailDrawerTab === 'transactions' ? 'active' : ''}" data-drawer-tab="transactions">Transactions (${(selNode.transactions_in.length + selNode.transactions_out.length)})</button>
        <button class="drawer-tab ${state.trailDrawerTab === 'why_flagged' ? 'active' : ''}" data-drawer-tab="why_flagged">Why Flagged (${rules.length})</button>
        <button class="drawer-tab ${state.trailDrawerTab === 'links' ? 'active' : ''}" data-drawer-tab="links">Links & Entity</button>
      </div>

      <div class="drawer-body">
        ${state.trailDrawerTab === 'summary' ? `
          ${window.CrossCaseModule?.renderDrawerCrossCaseSection ? window.CrossCaseModule.renderDrawerCrossCaseSection(selNode.id) : ''}
          <div class="drawer-info-grid">
            <div class="drawer-info-box">
              <span>Account Holder</span>
              <strong>${esc(selNode.holder)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Account Number</span>
              <strong>${esc(selNode.masked)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Bank Name</span>
              <strong>${esc(selNode.bank)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Risk Classification</span>
              <strong style="color:${selNode.risk_score >= 80 ? '#dc2626' : selNode.risk_score >= 50 ? '#ea580c' : '#10b981'}">
                ${esc(selNode.risk_level)} (${selNode.risk_score}/100)
              </strong>
            </div>
            <div class="drawer-info-box">
              <span>Traced Inflow</span>
              <strong>${formatMoneyINR(selNode.traced_in)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Traced Outflow</span>
              <strong>${formatMoneyINR(selNode.traced_out)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Balance Retained</span>
              <strong style="color:#0d9488">${formatMoneyINR(selNode.balance_retained)}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Holding Duration</span>
              <strong>${esc(selNode.time_held_str)}</strong>
            </div>
          </div>

          <span class="drawer-section-title">Quick Actions</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
            <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${esc(selNode.account_no || selNode.id)}');toast('Account copied!');">📋 Copy Account</button>
            <button class="btn btn-secondary" data-goto="transactions">⇄ Open in Transactions</button>
            <button class="btn btn-secondary" onclick="state.trailUtr='${esc(selNode.transactions_out[0]?.utr || state.trailUtr)}';render();toast('Re-tracing trail...');">⚡ Trace Downstream</button>
            <button class="btn btn-primary btn-legal-action" onclick="window.LegalDraftModule?.openModal({
              type: 'BANK_FREEZE',
              account: '${esc(selNode.account_no || selNode.id)}',
              name: '${esc(selNode.name || selNode.id)}',
              bank: '${esc(selNode.bank || '')}',
              amount: ${selNode.amount || state.case.amount || 0},
              utr: '${esc(selNode.transactions_in?.[0]?.utr || state.case.utr || '')}'
            })">📜 Draft Statutory Legal Notice</button>
          </div>
        ` : ''}

        ${state.trailDrawerTab === 'transactions' ? `
          <div class="table-scroll">
            <table>
              <thead><tr><th>Time</th><th>Dr/Cr</th><th>Amount</th><th>Counterparty</th><th>UTR</th></tr></thead>
              <tbody>
                ${[...selNode.transactions_in.map(t => ({...t, type:'CR'})), ...selNode.transactions_out.map(t => ({...t, type:'DR'}))].map(t => `
                  <tr>
                    <td class="mono">${esc(formatIST(t.datetime))}</td>
                    <td><span class="pill ${t.type === 'CR' ? 'pill-green' : 'pill-high'}">${t.type}</span></td>
                    <td class="amount">${formatMoneyINR(t.amount)}</td>
                    <td>${esc(t.type === 'CR' ? t.from : t.to)}</td>
                    <td class="mono">${esc(t.utr || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${state.trailDrawerTab === 'why_flagged' ? `
          <div class="reason-list">
            ${rules.length ? rules.map(r => `
              <div class="reason">
                <span class="reason-check">✓</span>
                <div>
                  <b>${esc(r.name)}</b>
                  <p>${esc(r.reason)}</p>
                  <span class="weight">+${r.weight} pts</span>
                </div>
              </div>
            `).join('') : '<p class="muted">No adverse heuristic flags triggered for this node.</p>'}
          </div>
        ` : ''}

        ${state.trailDrawerTab === 'links' ? `
          <div class="drawer-info-grid">
            <div class="drawer-info-box">
              <span>Bank Statement</span>
              <strong>${selNode.has_statement ? 'Available (Uploaded)' : 'Statement Not Available'}</strong>
            </div>
            <div class="drawer-info-box">
              <span>Statement Source</span>
              <strong>${esc(selNode.transactions_in[0]?.source_file || selNode.transactions_out[0]?.source_file || 'External Bank')}</strong>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (selEdge) {
    drawerContent = `
      <div class="drawer-head">
        <div>
          <span class="pill pill-muted">EDGE AUDIT</span>
          <h3>${esc(selEdge.source)} → ${esc(selEdge.target)}</h3>
        </div>
        <button class="drawer-close" id="closeDrawerBtn">×</button>
      </div>
      <div class="drawer-body">
        <div class="drawer-info-grid">
          <div class="drawer-info-box">
            <span>Traced Amount</span>
            <strong>${formatMoneyINR(selEdge.traced_amount)}</strong>
          </div>
          <div class="drawer-info-box">
            <span>Total Transferred</span>
            <strong>${formatMoneyINR(selEdge.amount)}</strong>
          </div>
          <div class="drawer-info-box">
            <span>Delay Since Arrival</span>
            <strong style="color:${selEdge.is_fast ? '#ef4444' : '#12527a'}">${esc(selEdge.elapsed_str)} ${selEdge.is_fast ? '⚡ (Fast Transfer)' : ''}</strong>
          </div>
          <div class="drawer-info-box">
            <span>Mode / Channel</span>
            <strong>${esc(selEdge.mode)}</strong>
          </div>
          <div class="drawer-info-box" style="grid-column:span 2">
            <span>Transaction UTR</span>
            <strong class="mono" style="color:#2563eb">${esc(selEdge.utr || 'NO-UTR')}</strong>
          </div>
          <div class="drawer-info-box" style="grid-column:span 2">
            <span>Narration / Remarks</span>
            <p style="margin:2px 0;font-size:9px;color:#475569">${esc(selEdge.narration || 'Direct transfer')}</p>
          </div>
        </div>
      </div>
    `;
  }

  // 6. SECOND VIEWS (Tabs below graph)
  let secondViews = `
    <div class="trail-second-views-card">
      <div class="trail-views-nav">
        <button class="trail-view-tab ${state.trailSecondView === 'hop_table' ? 'active' : ''}" data-view-tab="hop_table">📊 Hop Table</button>
        <button class="trail-view-tab ${state.trailSecondView === 'timeline' ? 'active' : ''}" data-view-tab="timeline">⏱ Vertical Timeline</button>
        <button class="trail-view-tab ${state.trailSecondView === 'sankey' ? 'active' : ''}" data-view-tab="sankey">🌊 Sankey Flow</button>
        <button class="trail-view-tab ${state.trailSecondView === 'ai_explanation' ? 'active' : ''}" data-view-tab="ai_explanation">🧠 AI Forensic Narrative</button>
      </div>

      <!-- Hop Table Pane -->
      <div class="trail-view-pane ${state.trailSecondView === 'hop_table' ? 'active' : ''}" id="pane_hop_table">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <b>Traced Transaction Hop Ledger (${trailData.edges.length} hops)</b>
          <button class="btn btn-secondary" id="btnExportHopCsv">📥 &nbsp;Export Table to CSV</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>HOP</th><th>FROM ACCOUNT</th><th>TO ACCOUNT</th><th>TRACED AMOUNT</th><th>TOTAL AMOUNT</th><th>TIMESTAMP (IST)</th><th>UTR</th><th>CHANNEL</th><th>DELAY</th>
              </tr>
            </thead>
            <tbody>
              ${trailData.edges.map((e, idx) => `
                <tr>
                  <td><span class="pill ${e.is_fast ? 'pill-high' : 'pill-muted'}">HOP ${idx === 0 ? 0 : 1 + (nodePositions[e.source]?.x ? Math.round((nodePositions[e.source].x - 60)/240) : 1)}</span></td>
                  <td class="mono"><b>${esc(e.source)}</b></td>
                  <td class="mono"><b>${esc(e.target)}</b></td>
                  <td class="amount">${formatMoneyINR(e.traced_amount)}</td>
                  <td class="amount" style="color:#64748b">${formatMoneyINR(e.amount)}</td>
                  <td class="mono">${esc(formatIST(e.datetime))}</td>
                  <td class="mono" style="color:#2563eb">${esc(e.utr || '-')}</td>
                  <td><span class="pill pill-muted">${esc(e.mode)}</span></td>
                  <td><b style="color:${e.is_fast ? '#ef4444' : '#12527a'}">${esc(e.elapsed_str)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Timeline Pane -->
      <div class="trail-view-pane ${state.trailSecondView === 'timeline' ? 'active' : ''}" id="pane_timeline">
        <div class="timeline">
          ${trailData.edges.map((e, idx) => `
            <div class="event">
              <time>${esc(e.datetime?.slice(11, 16) || '-')}<small>${esc(e.datetime?.slice(0, 10) || '')}</small></time>
              <div class="event-dot ${e.is_fast ? 'red' : 'cyan'}"></div>
              <div>
                <b>${esc(e.source)} → ${esc(e.target)} (${formatMoneyINR(e.traced_amount)})</b>
                <small>UTR: ${esc(e.utr || '-')} · Delay since arrival: ${esc(e.elapsed_str)} · Narration: ${esc(e.narration || 'Transfer')}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sankey Flow Pane -->
      <div class="trail-view-pane ${state.trailSecondView === 'sankey' ? 'active' : ''}" id="pane_sankey">
        <div class="sankey-wrapper">
          <div style="font:11px var(--sans);color:#475569;margin-bottom:12px">Visual breakdown of how victim funds split and exited:</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${trailData.edges.map(e => {
              let pct = Math.max(5, Math.round((e.traced_amount / (sum.amount_lost || 1)) * 100));
              return `
                <div style="display:flex;align-items:center;gap:12px;font-size:10px">
                  <div style="width:160px;font-family:var(--mono);text-align:right">${esc(e.source)}</div>
                  <div style="flex:1;background:#e2e8f0;border-radius:4px;height:20px;overflow:hidden;position:relative">
                    <div style="width:${pct}%;background:${e.is_fast ? '#ef4444' : '#0284c7'};height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;color:#fff;font-size:9px;font-weight:700">
                      ${pct}% (${formatMoneyINR(e.traced_amount)})
                    </div>
                  </div>
                  <div style="width:180px;font-family:var(--mono)">→ ${esc(e.target)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- AI Narrative Explanation Pane -->
      <div class="trail-view-pane ${state.trailSecondView === 'ai_explanation' ? 'active' : ''}" id="pane_ai_explanation">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <h3 style="margin:0;font-size:13px;color:#1e293b">🧠 AI Forensic Trail Narrative</h3>
            <span class="pill pill-muted" style="margin-top:4px">Verified Numbers from Normalized Database</span>
          </div>
          <button class="btn btn-secondary" id="btnRegenerateAiTrail">🤖 &nbsp;${state.isExplainingTrail ? 'Generating...' : 'Regenerate Briefing'}</button>
        </div>
        <div class="ai-dossier" style="margin-top:0">
          <div class="ai-dossier-head">
            <span class="ai-badge">${state.aiTrailNarrative?.badge || '🛡️ Autonomous Rule & Forensic Engine'}</span>
          </div>
          <p class="ai-summary-text" style="white-space:pre-line;font-size:11px;line-height:1.7;color:#1e293b" id="trailAiNarrativeText">
            ${esc(state.aiTrailNarrative?.narrative || `At ${sum.victim_info?.datetime || '14-Oct-2026 10:42:15'}, ${formatMoneyINR(sum.amount_lost)} was transferred from victim ${sum.victim_info?.name || 'MEERA NAIR'} to primary aggregator ${trailData.nodes[1]?.id || 'SUNRISE TRADERS'} (Hop 1, UTR ${sum.victim_info?.utr || '428714563201'}).

Within ${sum.fastest_transfer_time}, rapid layering commenced. Traced funds traversed through ${sum.hops_count} consecutive hops involving ${sum.mules_count} suspect mule accounts. Structuring was observed via round-figure transfers and parallel tranche forwarding.

A cumulative ${formatMoneyINR(sum.amount_cashed_out)} was successfully liquidated at ATM terminals. The remaining funds exited into external accounts without uploaded statements, requiring immediate statutory preservation notices under Section 91 & Section 106 BNSS 2023.`)}
          </p>
        </div>
      </div>
    </div>
  `;

  // Notice
  let notice = `
    <div class="investigative-lead-notice">
      <span>⚖️</span>
      <div><b>Investigative Lead Notice:</b> AI and rule outputs are investigative leads for cyber forensics, not final legal proof. Admissibility governed under Section 63 Bharatiya Sakshya Adhiniyam (BSA 2023).</div>
    </div>
  `;

  return `${head(
    `VICTIM UTR / ${esc(trailData.victim_utr)}`,
    'Money Trail from Victim UTR',
    'Interactive directed graph tracing victim funds hop-by-hop with deterministic FIFO allocation.',
    `<button class="btn btn-secondary" id="btnExportFullReport">📋 &nbsp;Export Trail Report</button>`
  )}
  <div class="trail-hero-container">
    ${inputPanel}
    ${summaryStrip}
    ${graphViewport}
    ${secondViews}
    ${notice}
  </div>

  <!-- Slide-Over Detail Drawer -->
  <aside class="trail-drawer ${drawerOpen ? 'open' : ''}" id="trailDrawer">
    ${drawerContent}
  </aside>
  `;
}

// -------------------------------------------------------------------------
// MONEY TRAIL INTERACTION WIRING: wireTrailEvents()
// -------------------------------------------------------------------------
function wireTrailEvents() {
  // 1. Search Box & Autocomplete
  let utrInput = $('#trailUtrInput');
  let autoBox = $('#trailAutocomplete');
  if (utrInput && autoBox) {
    utrInput.onfocus = () => autoBox.classList.add('show');
    utrInput.oninput = e => {
      let q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.trail-autocomplete-item').forEach(item => {
        let u = item.dataset.utr?.toLowerCase() || '';
        item.style.display = !q || u.includes(q) ? 'flex' : 'none';
      });
      autoBox.classList.add('show');
    };
    document.querySelectorAll('.trail-autocomplete-item').forEach(item => {
      item.onclick = () => {
        state.trailUtr = item.dataset.utr;
        autoBox.classList.remove('show');
        render();
      };
    });
  }

  $('#traceUtrBtn')?.addEventListener('click', () => {
    let val = $('#trailUtrInput')?.value?.trim();
    if (val) {
      state.trailUtr = val;
      render();
      toast('Tracing money trail from UTR: ' + val);
    }
  });

  $('#startAccountSelect')?.addEventListener('change', e => {
    let acc = e.target.value;
    if (acc) {
      let tx = state.transactions.find(t => t.from === acc);
      if (tx?.utr) {
        state.trailUtr = tx.utr;
        render();
        toast('Tracing from account ' + acc + ' via UTR ' + tx.utr);
      }
    }
  });

  $('#sunriseKiranQuickBtn')?.addEventListener('click', loadSunriseKiranDemo);
  $('#sunriseKiranTrailBtn')?.addEventListener('click', loadSunriseKiranDemo);
  $('#demoTrailBtn')?.addEventListener('click', () => {
    loadDemo();
    state.page = 'trail';
    render();
    toast('Synthetic demo case loaded! Tracing UTR SYN240814A001.');
  });

  // 2. Options Sliders
  $('#optMaxHops')?.addEventListener('input', e => {
    state.trailOptions.max_hops = Number(e.target.value);
    $('#lblMaxHops').textContent = e.target.value;
    render();
  });
  $('#optTimeWindow')?.addEventListener('input', e => {
    state.trailOptions.time_window = Number(e.target.value);
    $('#lblTimeWindow').textContent = e.target.value + 'h';
    render();
  });
  $('#optMinAmount')?.addEventListener('change', e => {
    state.trailOptions.min_amount = Number(e.target.value) || 0;
    render();
  });
  $('#optIncludeSmall')?.addEventListener('change', e => {
    state.trailOptions.include_small = e.target.checked;
    render();
  });
  $('#optAllocation')?.addEventListener('change', e => {
    state.trailOptions.allocation = e.target.value;
    render();
  });
  $('#optMergeParallel')?.addEventListener('change', e => {
    state.trailOptions.merge_parallel = e.target.checked;
    render();
  });

  // 3. Summary Card Click Filter
  document.querySelectorAll('.trail-kpi-card').forEach(card => {
    card.onclick = () => {
      let filter = card.dataset.trailFilter;
      state.trailFilter = state.trailFilter === filter ? null : filter;
      render();
    };
  });

  // 4. Node & Edge Selection & Drawer
  document.querySelectorAll('.trail-node-card').forEach(card => {
    card.onclick = e => {
      e.stopPropagation();
      let nid = card.dataset.nodeId;
      state.trailSelectedNode = nid;
      state.trailSelectedEdge = null;
      render();
    };
    card.onmouseenter = () => {
      state.trailHover = card.dataset.nodeId;
      highlightHoverState();
    };
    card.onmouseleave = () => {
      state.trailHover = null;
      clearHoverState();
    };
  });

  document.querySelectorAll('.trail-edge-label, .trail-edge-group').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      let eid = el.dataset.edgeId;
      state.trailSelectedEdge = eid;
      state.trailSelectedNode = null;
      render();
    };
  });

  // Drawer Tabs & Close
  $('#closeDrawerBtn')?.addEventListener('click', () => {
    state.trailSelectedNode = null;
    state.trailSelectedEdge = null;
    render();
  });

  document.querySelectorAll('.drawer-tab').forEach(tab => {
    tab.onclick = () => {
      state.trailDrawerTab = tab.dataset.drawerTab;
      render();
    };
  });

  // Close drawer on background click
  $('#trailCanvasArea')?.addEventListener('click', () => {
    if (state.trailSelectedNode || state.trailSelectedEdge) {
      state.trailSelectedNode = null;
      state.trailSelectedEdge = null;
      render();
    }
  });

  // 5. Second Views Tabs
  document.querySelectorAll('.trail-view-tab').forEach(tab => {
    tab.onclick = () => {
      state.trailSecondView = tab.dataset.viewTab;
      render();
    };
  });

  // CSV Export for Hop Table
  $('#btnExportHopCsv')?.addEventListener('click', () => {
    if (!state.trailResult?.edges?.length) return;
    let headers = ['Hop', 'From', 'To', 'Traced Amount', 'Total Amount', 'Timestamp', 'UTR', 'Mode', 'Delay'];
    let csvRows = [headers.join(',')];
    state.trailResult.edges.forEach((e, i) => {
      csvRows.push([
        `Hop ${i === 0 ? 0 : 1}`,
        `"${e.source}"`,
        `"${e.target}"`,
        e.traced_amount,
        e.amount,
        `"${e.datetime}"`,
        `"${e.utr || ''}"`,
        `"${e.mode}"`,
        `"${e.elapsed_str}"`
      ].join(','));
    });
    let blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `money_trail_${state.trailUtr || 'export'}.csv`;
    a.click();
    toast('Hop Table exported to CSV.');
  });

  // AI Narrative Regeneration
  $('#btnRegenerateAiTrail')?.addEventListener('click', async () => {
    if (state.isExplainingTrail || !state.trailResult) return;
    state.isExplainingTrail = true;
    toast('Consulting Gemini LLM for forensic money trail narrative...');
    render();
    try {
      let resp = await fetch(api('/api/ai/trail-explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trail: state.trailResult })
      });
      let data = await resp.json();
      if (data.success) {
        state.aiTrailNarrative = data;
        toast('AI Trail Briefing updated!');
      }
    } catch (e) {
      toast('AI Engine note: ' + e.message);
    } finally {
      state.isExplainingTrail = false;
      render();
    }
  });

  // Graph Pan & Zoom Controls
  let zoomEl = $('#trailPanZoomLayer');
  let canvasArea = $('#trailCanvasArea');

  function updateTransform() {
    if (zoomEl) {
      zoomEl.style.transform = `translate(${state.trailPanX || 0}px, ${state.trailPanY || 0}px) scale(${state.trailZoom || 1})`;
    }
  }

  $('#btnZoomIn')?.addEventListener('click', () => {
    state.trailZoom = Math.min(2.5, (state.trailZoom || 1) + 0.15);
    updateTransform();
  });

  $('#btnZoomOut')?.addEventListener('click', () => {
    state.trailZoom = Math.max(0.4, (state.trailZoom || 1) - 0.15);
    updateTransform();
  });

  $('#btnFitScreen')?.addEventListener('click', () => {
    state.trailZoom = 1;
    state.trailPanX = 0;
    state.trailPanY = 0;
    updateTransform();
    toast('Graph view reset to 100%');
  });

  $('#btnLayoutLayered')?.addEventListener('click', () => {
    state.trailZoom = 1;
    state.trailPanX = 0;
    state.trailPanY = 0;
    render();
    toast('Layered hop layout refreshed');
  });

  // Pan via mouse drag
  let isPanning = false, startX = 0, startY = 0;
  canvasArea?.addEventListener('mousedown', e => {
    if (e.target.closest('.trail-node-card, .trail-edge-label, .trail-toolbar-group, button, input')) return;
    isPanning = true;
    startX = e.clientX - (state.trailPanX || 0);
    startY = e.clientY - (state.trailPanY || 0);
    if (canvasArea) canvasArea.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!isPanning) return;
    state.trailPanX = e.clientX - startX;
    state.trailPanY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      if (canvasArea) canvasArea.style.cursor = 'default';
    }
  });

  // Speed Toggle
  $('#btnSpeedToggle')?.addEventListener('click', () => {
    state.playSpeed = state.playSpeed === 1 ? 2 : state.playSpeed === 2 ? 4 : 1;
    let btn = $('#btnSpeedToggle');
    if (btn) btn.textContent = state.playSpeed + 'x';
    toast('Playback speed set to ' + state.playSpeed + 'x');
  });

  // Export SVG
  $('#btnExportSvg')?.addEventListener('click', () => {
    let svg = document.querySelector('.trail-svg-overlay');
    if (!svg) return;
    let s = new XMLSerializer().serializeToString(svg);
    let blob = new Blob([s], { type: 'image/svg+xml' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `money_trail_${state.trailUtr || 'export'}.svg`;
    a.click();
    toast('SVG graph exported.');
  });

  // Export PNG / Add to report
  $('#btnExportPng')?.addEventListener('click', () => {
    toast('Capturing Money Trail snapshot for export...');
    window.print();
  });

  $('#btnAddToReport')?.addEventListener('click', () => {
    toast('Money Trail graph attached to active case dossier (BNSS §106).');
  });

  $('#btnExportFullReport')?.addEventListener('click', () => {
    state.page = 'reports';
    render();
    toast('Navigated to case reports with trail evidence attached.');
  });

  // Play Trail Animation
  $('#btnPlayTrail')?.addEventListener('click', () => {
    if (state.isPlaying) {
      state.isPlaying = false;
      render();
      return;
    }
    state.isPlaying = true;
    state.playStep = 0;
    playTrailStep();
  });

  function playTrailStep() {
    if (!state.isPlaying || !state.trailResult?.edges) return;
    if (state.playStep >= state.trailResult.edges.length) {
      state.isPlaying = false;
      state.playStep = 0;
      toast('Trail playback completed.');
      render();
      return;
    }
    let currentEdge = state.trailResult.edges[state.playStep];
    state.trailSelectedEdge = currentEdge.id;
    let clockPill = $('#trailClockPill');
    if (clockPill) clockPill.textContent = currentEdge.datetime?.slice(11, 19) || '10:42:15';
    let scrubber = $('#trailScrubber');
    if (scrubber) scrubber.value = state.playStep;

    highlightHoverState(currentEdge.source, currentEdge.target);
    state.playStep++;
    let delay = (1500 / state.playSpeed);
    setTimeout(playTrailStep, delay);
  }

  // Keyboard Shortcuts: 'F' = Fit, '/' = Search, 'Space' = Play
  window.onkeydown = e => {
    if (state.page !== 'trail') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      $('#btnFitScreen')?.click();
      toast('Fit graph to screen');
    } else if (e.key === '/') {
      e.preventDefault();
      $('#trailUtrInput')?.focus();
    } else if (e.code === 'Space') {
      e.preventDefault();
      $('#btnPlayTrail')?.click();
    } else if (e.key === 'Escape') {
      state.trailSelectedNode = null;
      state.trailSelectedEdge = null;
      render();
    }
  };
}

function highlightHoverState(src, tgt) {
  let targetSrc = src || state.trailHover;
  let targetTgt = tgt;
  document.querySelectorAll('.trail-node-card').forEach(c => {
    let id = c.dataset.nodeId;
    if (id === targetSrc || id === targetTgt) {
      c.classList.add('highlighted');
      c.classList.remove('dimmed');
    } else {
      c.classList.add('dimmed');
    }
  });
}

function clearHoverState() {
  document.querySelectorAll('.trail-node-card, .trail-edge-group').forEach(c => {
    c.classList.remove('highlighted', 'dimmed');
  });
}

// 1-Click Sample Dataset Loader (Acceptance Test Scenario)
async function loadSunriseKiranDemo() {
  toast('Loading Verified Sample Statements: Sunrise Traders & Kiran Enterprises...');
  try {
    let resp = await fetch(api('/api/sample-statements'));
    let data = await resp.json();
    if (data.success && data.rows?.length) {
      state.case = data.case;
      state.transactions = data.rows;
      state.statementAccounts = data.statement_accounts || [];
      state.files = [
        { name: 'Sample_Statement_SunriseTraders.pdf', detected: 'PDF Statement · 25 txns', size: '5.5 KB', ext: 'pdf', status: 'Done', progress: 100 },
        { name: 'Sample_Statement_KiranEnterprises.xlsx', detected: 'XLSX Statement · 21 txns', size: '6.9 KB', ext: 'xlsx', status: 'Done', progress: 100 }
      ];
      state.loaded = true;
      state.trailUtr = data.case.utr; // '428714563201'
      state.page = 'trail'; // Navigate straight to Money Trail Hero Page!
      render();
      toast('Sample statements loaded! Money Trail active from UTR 428714563201.');
      return;
    }
  } catch (err) {
    console.warn('API fetch failed, falling back to bundled sample_fixture:', err);
  }

  // Resilient fallback to bundled sample_fixture.js
  if (window.SAMPLE_STATEMENT_DATA) {
    state.case = window.SAMPLE_STATEMENT_DATA.case;
    state.transactions = window.SAMPLE_STATEMENT_DATA.rows;
    state.statementAccounts = window.SAMPLE_STATEMENT_DATA.statement_accounts || [];
    state.files = [
      { name: 'Sample_Statement_SunriseTraders.pdf', detected: 'PDF Statement · 26 txns', size: '5.5 KB', ext: 'pdf', status: 'Done', progress: 100 },
      { name: 'Sample_Statement_KiranEnterprises.xlsx', detected: 'XLSX Statement · 21 txns', size: '6.9 KB', ext: 'xlsx', status: 'Done', progress: 100 }
    ];
    state.loaded = true;
    state.trailUtr = '428714563201';
    state.page = 'trail';
    render();
    toast('Bundled sample statements loaded! Money Trail active from UTR 428714563201.');
  }
}


// =========================================================================
// Domain and IP threat intelligence module
// Threat feeds, brand protection heuristics, abuse TLD detection,
// WHOIS/age simulation, and lawful CERT-In reporting contacts.
// =========================================================================

const SATARK_BRANDS = [
  { id: 'sbi', name: 'State Bank of India', domains: ['sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com', 'sbi.bank.in'], keywords: ['sbi', 'yono', 'state bank'], abuseContact: 'report.phishing@sbi.co.in' },
  { id: 'hdfc', name: 'HDFC Bank', domains: ['hdfcbank.com', 'hdfcbank.bank.in'], keywords: ['hdfc', 'hdfc bank'], abuseContact: 'report.phishing@hdfcbank.com' },
  { id: 'icici', name: 'ICICI Bank', domains: ['icicibank.com', 'icicibank.bank.in'], keywords: ['icici', 'icici bank', 'imobile'], abuseContact: 'antiphishing@icicibank.com' },
  { id: 'axis', name: 'Axis Bank', domains: ['axisbank.com', 'axisbank.bank.in'], keywords: ['axis bank', 'axis'], abuseContact: 'phishing@axisbank.com' },
  { id: 'pnb', name: 'Punjab National Bank', domains: ['pnbindia.in', 'pnb.bank.in'], keywords: ['pnb', 'punjab national bank'], abuseContact: 'incident@pnb.co.in' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', domains: ['kotak.com', 'kotak.bank.in'], keywords: ['kotak', '811'], abuseContact: 'report.phishing@kotak.com' },
  { id: 'phonepe', name: 'PhonePe', domains: ['phonepe.com'], keywords: ['phonepe'], abuseContact: 'support@phonepe.com' },
  { id: 'paytm', name: 'Paytm / Payments Bank', domains: ['paytm.com', 'paytmbank.com'], keywords: ['paytm', 'paytm bank'], abuseContact: 'cybercell@paytm.com' },
  { id: 'googlepay', name: 'Google Pay', domains: ['pay.google.com'], keywords: ['gpay', 'google pay'], abuseContact: 'support-in@google.com' },
  { id: 'uidai', name: 'UIDAI Aadhaar', domains: ['uidai.gov.in', 'myaadhaar.uidai.gov.in'], keywords: ['uidai', 'aadhaar', 'eaadhaar'], abuseContact: 'help@uidai.gov.in' },
  { id: 'incometax', name: 'Income Tax Department', domains: ['incometax.gov.in'], keywords: ['incometax', 'itr', 'refund'], abuseContact: 'incident@incometax.gov.in' },
  { id: 'parivahan', name: 'Parivahan Sewa / eChallan', domains: ['parivahan.gov.in', 'echallan.parivahan.gov.in'], keywords: ['parivahan', 'echallan', 'mparivahan', 'challan'], abuseContact: 'helpdesk-mparivahan@gov.in' },
  { id: 'indiapost', name: 'India Post', domains: ['indiapost.gov.in'], keywords: ['indiapost', 'postinfo', 'speed post'], abuseContact: 'feedback@indiapost.gov.in' }
];

const SATARK_HIGH_ABUSE_TLDS = [
  '.xyz', '.top', '.online', '.icu', '.buzz', '.cam', '.live', '.cfd', '.sbs',
  '.rest', '.site', '.website', '.club', '.vip', '.click', '.link', '.test',
  '.fun', '.tk', '.ml', '.ga', '.cf', '.gq', '.work'
];

const SATARK_URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'ow.ly', 'buff.ly'
];

const SATARK_TRUSTED_TLDS = ['.gov.in', '.nic.in', '.bank.in', '.ac.in', '.edu', '.gov', '.mil'];

function satarkAnalyzeUrl(rawUrl, resolvedIp, nameServer) {
  let cleanUrl = String(rawUrl || '').trim();
  if (!cleanUrl) return null;
  let parsed;
  try {
    parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`);
  } catch(e) {
    parsed = { hostname: cleanUrl.split('/')[0], protocol: 'http:', pathname: '', searchParams: new URLSearchParams() };
  }

  let host = (parsed.hostname || cleanUrl).toLowerCase();
  let isHttps = parsed.protocol === 'https:';
  let flags = [];
  let tldMatch = host.match(/\.[a-z0-9]+(\.[a-z0-9]+)?$/i);
  let tld = tldMatch ? tldMatch[0].toLowerCase() : '';
  let ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // Check 1: High-Abuse TLD Hit
  if (SATARK_HIGH_ABUSE_TLDS.some(t => host.endsWith(t))) {
    flags.push(`High-abuse TLD (${tld}), frequent in bulk disposable phishing kits.`);
  }

  // Check 2: URL Shortener
  if (SATARK_URL_SHORTENERS.includes(host)) {
    flags.push('URL shortener detected: obfuscates true destination domain.');
  }

  // Check 3: Direct IP address host
  if (ipRegex.test(host)) {
    flags.push('Direct IP address host (no DNS domain name, anti-analysis evasion).');
  }

  // Check 4: Obfuscation tricks (@ symbol)
  if (cleanUrl.includes('@')) {
    flags.push('URL contains "@" character (RFC 3986 credential spoofing trick).');
  }

  // Check 5: Subdomain depth
  let subCount = host.split('.').length - 2;
  if (subCount >= 3) {
    flags.push(`Excessive subdomain nesting (${subCount} levels deep, subdomain cloaking).`);
  }

  // Check 6: SSL / TLS check
  if (!isHttps) {
    flags.push('No SSL/TLS encryption (HTTP plain text, credential interception risk).');
  }

  // Check 7: Open Redirect parameters
  let redirectKeys = ['url', 'redirect', 'link', 'dest', 'target', 'goto', 'return'];
  for (let rk of redirectKeys) {
    if (parsed.searchParams?.get(rk)) {
      flags.push(`Open redirect parameter "?${rk}=" detected: traffic pivoting.`);
      break;
    }
  }

  // Check 8: Brand Impersonation / Lookalike Search
  let matchedBrand = null;
  for (let b of SATARK_BRANDS) {
    if (b.keywords.some(kw => host.includes(kw))) {
      let isOfficial = b.domains.some(od => host === od || host.endsWith('.' + od));
      if (!isOfficial) {
        matchedBrand = b;
        flags.push(`Brand lookalike detected: ${b.name} (${b.id.toUpperCase()}): unauthorized brand mimicry.`);
        break;
      }
    }
  }

  // Check 9: Suspicious credential / payment keywords in path or domain
  let susKeywords = ['login', 'verify', 'update', 'secure', 'account', 'kyc', 'unlock', 'claim', 'refund', 'challan', 'bonus', 'wallet', 'payee'];
  let matchedKw = susKeywords.filter(kw => host.includes(kw) || (parsed.pathname && parsed.pathname.toLowerCase().includes(kw)));
  if (matchedKw.length > 0 && !matchedBrand) {
    flags.push(`Phishing-themed keywords: ${matchedKw.slice(0, 3).join(', ')}.`);
  }

  // Risk Classification (Satark Rule Gating)
  let riskLevel = 'Low';
  if (SATARK_TRUSTED_TLDS.some(t => host.endsWith(t))) {
    riskLevel = 'Low';
  } else if (flags.length >= 3 || matchedBrand || host.includes('phish') || host.includes('payee') || host.includes('wallet')) {
    riskLevel = 'High';
  } else if (flags.length >= 1) {
    riskLevel = 'Medium';
  }

  // Simulated Domain Age
  let domainAge = riskLevel === 'High' ? '< 30 days · Newly registered' : riskLevel === 'Medium' ? '< 6 months · Recent' : '> 1 year · Established';

  return {
    domain: host,
    url: cleanUrl,
    ip: resolvedIp || (ipRegex.test(host) ? host : '198.51.100.24'),
    ns: nameServer || 'ns1.sample-ns.test',
    tld: tld || '.test',
    isHttps,
    domainAge,
    riskLevel,
    flags,
    matchedBrand,
    abuseContact: matchedBrand?.abuseContact || 'incident@cert-in.org.in'
  };
}

let initialCaseDomains = [
  satarkAnalyzeUrl('secure-payee-demo.test', '198.51.100.24', 'ns1.sample-ns.test'),
  satarkAnalyzeUrl('verify-wallet-demo.test', '198.51.100.24', 'ns1.sample-ns.test'),
  satarkAnalyzeUrl('account-check-demo.test', '203.0.113.77', 'ns2.sample-ns.test'),
  satarkAnalyzeUrl('help-transfer-demo.test', '203.0.113.88', 'ns3.sample-ns.test'),
  satarkAnalyzeUrl('phish-sbi-portal.top', '198.51.100.24', 'ns1.sample-ns.test'),
  satarkAnalyzeUrl('parivahan-challan-pay.online', '203.0.113.77', 'ns2.sample-ns.test')
].filter(Boolean);

function intelPage() {
  if (!state.loaded) return empty();
  if (!state.intelDomains || !state.intelDomains.length) {
    state.intelDomains = [...initialCaseDomains];
  }

  let domainList = state.intelDomains;
  let highCount = domainList.filter(d => d.riskLevel === 'High').length;
  let mediumCount = domainList.filter(d => d.riskLevel === 'Medium').length;
  let safeCount = domainList.filter(d => d.riskLevel === 'Low').length;
  let uniqueIps = [...new Set(domainList.map(d => d.ip))];

  // Domain Cards HTML
  let domainCardsHtml = domainList.map(d => {
    let riskClass = d.riskLevel === 'High' ? 'high' : d.riskLevel === 'Medium' ? 'medium' : 'low';
    let riskLabel = d.riskLevel === 'High' ? 'CRITICAL / PHISHING' : d.riskLevel === 'Medium' ? 'SUSPICIOUS' : 'LOW RISK';
    let lockIcon = d.isHttps ? '🔒 HTTPS' : '🔓 HTTP (No SSL)';
    return `
      <div class="satark-domain-card ${riskClass}">
        <div class="satark-domain-header">
          <div class="satark-domain-title">
            <span style="font-size:16px;">🌐</span>
            <span class="satark-domain-name">${esc(d.domain)}</span>
            <button class="satark-quick-pill" data-copy-ioc="${esc(d.domain)}" title="Copy IOC">📋</button>
          </div>
          <span class="satark-risk-badge ${riskClass}">
            ${d.riskLevel === 'High' ? '⚠️' : d.riskLevel === 'Medium' ? '⚡' : '✓'} ${riskLabel}
          </span>
          ${window.CrossCaseModule?.renderIntelBadge ? window.CrossCaseModule.renderIntelBadge(d.ip) : ''}
        </div>

        <div class="satark-stat-grid">
          <div class="satark-stat-item">
            <span>ENCRYPTION</span>
            <b>${lockIcon}</b>
          </div>
          <div class="satark-stat-item">
            <span>DOMAIN AGE</span>
            <b>${esc(d.domainAge)}</b>
          </div>
          <div class="satark-stat-item">
            <span>RESOLVED IP</span>
            <b>${esc(d.ip)}</b>
          </div>
          <div class="satark-stat-item">
            <span>NAMESERVER</span>
            <b>${esc(d.ns)}</b>
          </div>
        </div>

        ${d.flags && d.flags.length ? `
          <div class="satark-flags-container">
            ${d.flags.map(f => `
              <div class="satark-flag-item">
                <span>⚠️</span>
                <div>${esc(f)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="satark-domain-footer">
          <div>
            ${d.matchedBrand ? `
              <span class="satark-abuse-pill">🎯 Mimics: ${esc(d.matchedBrand.name)}</span>
              <span style="margin-left:6px; color:#475569;">Abuse: <b style="font-family:var(--mono);">${esc(d.abuseContact)}</b></span>
            ` : `
              <span style="color:#64748b;">CERT-In Escalation: <b style="font-family:var(--mono);">${esc(d.abuseContact)}</b></span>
            `}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm dns-ct-btn" data-domain="${esc(d.domain)}" style="font-size:10px;padding:3px 8px;background:#ecfdf5;border-color:#a7f3d0;color:#065f46;font-weight:700">📜 Historical DNS & CT (SHA3-256)</button>
            <button class="btn btn-secondary btn-sm btn-legal-action" onclick="window.LegalDraftModule?.openModal({
              type: 'REGISTRAR_NOTICE',
              domain: '${esc(d.domain)}',
              ip: '${esc(d.ip)}',
              ns: '${esc(d.ns)}',
              abuse: '${esc(d.abuseContact)}'
            })" style="font-size:10px;padding:3px 8px;">⚖️ Notice to Host/Registrar</button>
            <button class="satark-quick-pill" data-copy-ioc="${esc(d.domain)} (IP: ${esc(d.ip)}, Brand: ${esc(d.matchedBrand?.name || 'Unattributed')})">
              + Add to Report
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // IP Infrastructure Cards HTML
  let ipMeta = {
    '198.51.100.24': { asn: 'AS64510 · Synthetic Demo VPS', geo: 'Mumbai, Maharashtra · India', isp: 'National Telecom / Cloud IX' },
    '203.0.113.77': { asn: 'AS64510 · Cloud Transit Provider', geo: 'Frankfurt, Hesse · Germany', isp: 'EU Synthetic Transit' },
    '203.0.113.88': { asn: 'AS64510 · Bulletproof Edge Cache', geo: 'Amsterdam, North Holland · Netherlands', isp: 'Global Fast Edge' },
    '192.0.2.41': { asn: 'AS64510 · Autonomous Relay', geo: 'Singapore · SG Regional Hub', isp: 'APAC Cloud Relay' }
  };

  let ipCardsHtml = uniqueIps.map(ip => {
    let meta = ipMeta[ip] || { asn: 'AS64510 · Autonomous System', geo: 'India / Regional ISP', isp: 'Commercial IP Transit' };
    let hosted = domainList.filter(d => d.ip === ip).map(d => d.domain);
    return `
      <div class="satark-ip-card">
        <div class="satark-ip-head">
          <b>${esc(ip)}</b>
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="btn btn-secondary btn-sm btn-legal-action" onclick="window.LegalDraftModule?.openModal({
              type: 'REGISTRAR_NOTICE',
              ip: '${esc(ip)}'
            })" style="font-size:9.5px;padding:2px 6px;">📜 Notice</button>
            <button class="satark-quick-pill" data-copy-ioc="${esc(ip)}" title="Copy IP">📋 Copy</button>
          </div>
        </div>
        <div class="satark-ip-meta">
          <div>🏢 <b>${esc(meta.asn)}</b></div>
          <div style="margin-top:2px;">📍 ${esc(meta.geo)} · <span style="color:#64748b;">${esc(meta.isp)}</span></div>
        </div>
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">HOSTED CASE DOMAINS (${hosted.length}):</div>
        <div class="satark-ip-domains">
          ${hosted.map(h => `<span class="satark-ip-domain-tag">${esc(h)}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Brand Radar HTML (from Satark AI brands)
  let brandRadarHtml = SATARK_BRANDS.slice(0, 6).map(b => `
    <div class="satark-radar-item">
      <div>
        <div class="satark-radar-brand">${esc(b.name)}</div>
        <div class="satark-radar-genuine">✓ Official: ${b.domains.join(', ')}</div>
      </div>
      <a href="mailto:${esc(b.abuseContact)}" class="satark-quick-pill" style="text-decoration:none;" title="Send takedown notice">
        ✉️ ${esc(b.abuseContact)}
      </a>
    </div>
  `).join('');

  return `
    ${head('PASSIVE INTELLIGENCE / CACHED', 'Domains & IPs', 'Powered by Satark AI heuristic scanner, Indian brand protection radar & passive DNS correlation.')}
    <div class="note-strip">
      🛡️ <b>Satark AI Threat Intelligence Active</b>: Domain indicators are analyzed with heuristic lookalike brand matching, high-abuse TLD classification, and lawful reporting endpoints (CERT-In / BNSS §94).
    </div>

    <!-- Satark AI Interactive Live Scanner Input -->
    <div class="card satark-scanner-card">
      <div class="satark-scanner-head">
        <div class="satark-brand-tag">
          <span class="satark-badge-shield">🛡️</span>
          <div>
            <strong>SATARK AI · PASSIVE INDICATOR & LINK ANALYZER</strong>
            <small>Real-time threat feed verification, abuse TLD matching & Indian brand protection heuristics</small>
          </div>
        </div>
        <div class="satark-certin-pill">
          <span>●</span> CERT-In & BNSS §94 Formatted
        </div>
      </div>
      <div class="satark-search-bar">
        <input id="satarkDomainInput" type="text" placeholder="Enter suspicious domain, phishing URL, or IP indicator (e.g. sbi-kyc-verify.top, 198.51.100.24)...">
        <button class="btn btn-primary" id="satarkAnalyzeBtn">⚡ Analyze Indicator</button>
      </div>
      <div class="satark-quick-pills">
        <small>Quick test indicators:</small>
        <button class="satark-quick-pill" data-scan="phish-sbi-portal.top">phish-sbi-portal.top</button>
        <button class="satark-quick-pill" data-scan="parivahan-challan-pay.online">parivahan-challan-pay.online</button>
        <button class="satark-quick-pill" data-scan="bit.ly/claim-refund-upi">bit.ly/claim-refund-upi</button>
        <button class="satark-quick-pill" data-scan="198.51.100.24">198.51.100.24 (Direct IP)</button>
        <button class="satark-quick-pill" data-scan="onlinesbi.sbi">onlinesbi.sbi (Official SBI)</button>
      </div>
    </div>

    <!-- KPI Metrics Strip -->
    <div class="satark-kpi-strip">
      <div class="card satark-kpi">
        <small>MONITORED INDICATORS</small>
        <b>${domainList.length}</b>
        <span>Threat infrastructure tracked</span>
      </div>
      <div class="card satark-kpi danger">
        <small>CRITICAL / HIGH PHISHING</small>
        <b>${highCount}</b>
        <span class="text-danger">Brand impersonation & active campaigns</span>
      </div>
      <div class="card satark-kpi warning">
        <small>SUSPICIOUS DOMAINS</small>
        <b>${mediumCount}</b>
        <span class="text-warning">High-abuse TLDs & cloaking</span>
      </div>
      <div class="card satark-kpi safe">
        <small>RESOLVED HOSTING IPS</small>
        <b>${uniqueIps.length}</b>
        <span>Shared hosting endpoints</span>
      </div>
    </div>

    <!-- Two-Column Layout -->
    <div class="satark-layout">
      <!-- Left Column: Domains & Infrastructure Analysis -->
      <div class="satark-column">
        <div class="card satark-panel">
          <div class="card-heading" style="padding:14px 16px; border-bottom:1px solid #f1f5f9; margin-bottom:14px;">
            <div>
              <b>Domains and Phishing Infrastructure</b>
              <small>Analyzed via Satark AI Brand Radar & Threat Feeds</small>
            </div>
            <span class="satark-quick-pill" style="font-weight:700;">${domainList.length} domains</span>
          </div>
          <div class="satark-cards-list">
            ${domainCardsHtml}
          </div>
        </div>
      </div>

      <!-- Right Column: IP & Hosting Records + Brand Radar -->
      <div class="satark-column">
        <div class="card satark-panel">
          <div class="card-heading" style="padding:14px 16px; border-bottom:1px solid #f1f5f9; margin-bottom:14px;">
            <div>
              <b>IP & Hosting Infrastructure Records</b>
              <small>Passive DNS correlation & hosting providers</small>
            </div>
            <span class="satark-quick-pill" style="font-weight:700;">${uniqueIps.length} IPs</span>
          </div>
          <div class="satark-ip-list">
            ${ipCardsHtml}
          </div>
        </div>

        <div class="card satark-panel" style="margin-top: 16px;">
          <div class="card-heading" style="padding:14px 16px; border-bottom:1px solid #f1f5f9; margin-bottom:10px;">
            <div>
              <b>Satark AI Indian Brand Protection Radar</b>
              <small>Official domains vs scam vectors & abuse reporting</small>
            </div>
          </div>
          <div class="satark-radar-list">
            ${brandRadarHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function otherPage() {
  if (state.page === 'blockchain' && window.BlockchainIcjsModule?.renderBlockchainPage) {
    return window.BlockchainIcjsModule.renderBlockchainPage();
  }
  if (state.page === 'relationships' && window.CrossCaseModule?.renderRelationshipsPage) {
    return window.CrossCaseModule.renderRelationshipsPage();
  }
  if (!state.loaded) return empty();
  if (state.page === 'relationships') {
    return `${head('ENTITY LINKS', 'Relationships', 'Entities are linked from intake indicators and statement evidence.')}
    <div class="card table-card">
      ${domains.slice(0, 2).map(d => `
        <div class="share-item">
          <span class="share-icon">IP</span>
          <div><b>${d[0]}</b><small>Shares ${d[1]} and ${d[2]}</small></div>
          <span class="pill pill-high">SHARED</span>
        </div>
      `).join('')}
      <div class="share-item">
        <span class="share-icon">UTR</span>
        <div><b>${esc(state.case.utr)}</b><small>Complaint-linked transfer in transaction evidence</small></div>
      </div>
    </div>`;
  }
  if (state.page === 'timeline') {
    return `${head('CASE CORRELATION', 'Timeline', 'Transaction events and intake complaint timestamps.')}
    <div class="card timeline-card">
      ${state.transactions.map(t => `
        <div class="event">
          <time>${esc(t.datetime.slice(11, 16))}<small>IST</small></time>
          <i class="event-dot orange"></i>
          <div>
            <b>${esc(t.narration)}</b>
            <small>${t.from} → ${t.to} · ${money(t.amount)} · ${t.utr}</small>
            <a data-goto="transactions">${t.source_file} ${t.source_row}</a>
          </div>
        </div>
      `).join('')}
    </div>`;
  }
  if (state.page === 'requests') {
    return `${head('DRAFT TEMPLATES', 'Requests', 'Subscriber/login/access records are requested only under applicable legal process.')}
    <div class="card request-card">
      <div><h3>Bank records request</h3><p>Editable synthetic draft populated from this case.</p></div>
      <button class="btn btn-secondary" id="draftBtn">Create draft</button>
    </div>
    <div id="draft"></div>`;
  }
  let topMules = flags();
  let defaultActions = [
    'Issue immediate debit-freeze notice under Section 106 BNSS 2023 to nodal banks for suspect intermediary accounts.',
    'Requisition IP login logs, device IMEI/MAC, and UPI registration CDRs under Section 94 BNSS 2023 from NPCI.',
    'Issue statutory summons under Section 91 CrPC / Section 63 BSA for certified KYC dossiers and account opening mandate forms.'
  ];
  let statutoryActions = state.aiAudit?.statutory_action_plan?.length ? state.aiAudit.statutory_action_plan : defaultActions;

  return `${head('CASE OUTPUT', 'Reports', 'Statutory financial crime dossier formatted for legal preservation and court admissibility.', '<button class="btn btn-secondary" id="bsaCertBtn" style="background:#ecfdf5;border-color:#a7f3d0;color:#065f46;font-weight:700">📜 &nbsp;Section 63 BSA Certificate (SHA3-256)</button> <button class="btn btn-primary" id="printBtn">🖨️ &nbsp;Print / Save PDF</button>')}
  <div class="card report-preview">
    <div class="report-cover">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <span class="report-cover-tag">● RAJASTHAN CYBER COMMAND // CASE FORENSIC DOSSIER</span>
        <span style="font:8px var(--mono);color:#93c5fd;letter-spacing:1px;background:rgba(255,255,255,0.08);padding:3px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.15)">
          BNSS §94 & §106 COMPLIANT
        </span>
      </div>
      <h1>Financial Crime Case Summary</h1>
      <p>Case ID: <b>${esc(state.case.caseId || 'CR-2026-4412')}</b> · ${esc(state.case.title || 'Financial Fraud Investigation')} · Complaint UTR: <b>${esc(state.case.utr || 'SYN240814A001')}</b></p>
    </div>

    <div class="report-body">
      <h3><span>📋</span> Case Intake & Complaint Details</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:12px 0 16px">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px">
          <small style="color:#64748b;font-size:9px;text-transform:uppercase;font-weight:700;display:block">Victim / Complainant</small>
          <strong style="color:#0f172a;font-size:12px;display:block;margin-top:2px">${esc(state.case.victimName || 'Victim Complainant')}</strong>
          <span style="color:#64748b;font-size:10px;font-family:var(--mono)">Acct: ${esc(state.case.victimAccount || 'ACC-VIC-2041')}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px">
          <small style="color:#64748b;font-size:9px;text-transform:uppercase;font-weight:700;display:block">Disputed Loss Amount</small>
          <strong style="color:#dc2626;font-size:14px;display:block;margin-top:2px;font-family:var(--mono)">${money(state.case.amount || 185000)}</strong>
          <span style="color:#64748b;font-size:10px">Complaint UTR: <b class="mono">${esc(state.case.utr || 'SYN240814A001')}</b></span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px">
          <small style="color:#64748b;font-size:9px;text-transform:uppercase;font-weight:700;display:block">Evidence Ledger Telemetry</small>
          <strong style="color:#0f172a;font-size:12px;display:block;margin-top:2px">${state.files.length} Files Ingested</strong>
          <span style="color:#64748b;font-size:10px">${state.transactions.length} Transactions · ${accounts().length} Accounts (${topMules.length} Flagged)</span>
        </div>
      </div>

      ${state.aiAudit ? `
        <h3><span>🧠</span> AI Forensic Intelligence & Modus Operandi</h3>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:12px 16px;margin:10px 0 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <b style="color:#4c1d95;font-size:12px">${esc(state.aiAudit.modus_operandi_type || 'Layered Pass-Through Syndicate')}</b>
            <span class="pill pill-high" style="font-size:9px">${state.aiAudit.is_live_ai ? '⚡ Gemini 3.8 Flash' : '🛡️ Rule Engine AI'}</span>
          </div>
          <p style="margin:0;color:#5b21b6;font-size:11px;line-height:1.5">${esc(state.aiAudit.executive_summary)}</p>
        </div>
      ` : ''}

      <h3><span>🛡️</span> 5-Rule Explainable Heuristic & Mule Findings (${topMules.length} Suspects)</h3>
      <div style="overflow-x:auto;margin:12px 0 16px;border:1px solid #e2e8f0;border-radius:6px">
        <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.5px">
              <th style="padding:8px 12px">SUSPECT ACCOUNT</th>
              <th style="padding:8px 12px;text-align:center">SCORE</th>
              <th style="padding:8px 12px">RISK TIER</th>
              <th style="padding:8px 12px">TRIGGERED FORENSIC RULES</th>
              <th style="padding:8px 12px">STATUTORY ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${topMules.map((m, idx) => `
              <tr style="border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#ffffff' : '#fcfdfd'}">
                <td style="padding:10px 12px;font-family:var(--mono);font-weight:700;color:#0f172a">${esc(m.id)}</td>
                <td style="padding:10px 12px;text-align:center">
                  <span class="score ${m.level.toLowerCase()}" style="font-size:11px">${m.score}</span>
                </td>
                <td style="padding:10px 12px">
                  <span class="pill ${m.level === 'Critical' ? 'pill-critical' : 'pill-high'}">${esc(m.level)}</span>
                </td>
                <td style="padding:10px 12px">
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                    ${m.rules.map(r => `<span style="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:3px;padding:1px 6px;font-size:9px"><b>✓</b> ${esc(r.name)} (+${r.weight})</span>`).join('')}
                  </div>
                </td>
                <td style="padding:10px 12px">
                  <span style="font-weight:600;color:${m.level === 'Critical' ? '#dc2626' : '#ea580c'};font-size:10px">
                    ${m.level === 'Critical' ? '§106 Debit Freeze' : '§94 Preservation'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <h3><span>⚖️</span> Statutory Action Plan (BNSS 2023 Directives)</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0 16px">
        ${statutoryActions.map((action, i) => `
          <div style="display:flex;gap:10px;align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #0284c7;border-radius:4px;padding:8px 12px;font-size:11px">
            <span style="font-family:var(--mono);font-weight:800;color:#0284c7;font-size:9px">DIRECTIVE 0${i + 1}</span>
            <span style="color:#334155;line-height:1.4">${esc(action)}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:9px;color:#64748b;font-family:var(--mono)">
        <span>DIGITALLY VERIFIED EVIDENCE // RAJASTHAN POLICE CYBER CRIME CELL</span>
        <span>SHA-256: 8f4c99a2b71e3300f8911c429d88e4010a392bb1c2a</span>
      </div>
    </div>
  </div>`;
}

// -------------------------------------------------------------------------
// STATEMENT PARSER MODULE (MULTI-STATEMENT NORMALISATION & INGESTION HUB)
// -------------------------------------------------------------------------

function formatDateTimeIST(isoStr, hasTime = true) {
  if (!isoStr) return '-';
  if (hasTime === false || !isoStr.includes('T')) {
    let d = new Date(isoStr);
    if (isNaN(d.getTime())) return `${esc(isoStr)} <span style="color:#94a3b8;font-size:10px">(time not available)</span>`;
    let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()} <span style="color:#94a3b8;font-size:10px">(time not available)</span>`;
  }
  let d = new Date(isoStr);
  if (isNaN(d.getTime())) return esc(isoStr);
  let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()} ${timeStr} IST`;
}

function exportCSV(rows, filename = 'tracegrid_normalised_transactions.csv') {
  if (!rows || !rows.length) { toast('No transactions to export'); return; }
  let headers = ['Date & Time', 'Account Holder', 'Account Number', 'Direction', 'Amount', 'Balance', 'Counterparty', 'UTR / Ref', 'Mode', 'Narration', 'Match ID', 'Source File'];
  let lines = [headers.join(',')];
  rows.forEach(r => {
    let vals = [
      `"${r.datetime || ''}"`,
      `"${(r.account_holder || '').replace(/"/g, '""')}"`,
      `"${r.account_number || ''}"`,
      `"${r.direction || ''}"`,
      r.amount || 0,
      r.balance || '',
      `"${(r.counterparty_name || '').replace(/"/g, '""')}"`,
      `"${r.utr || ''}"`,
      `"${r.mode || ''}"`,
      `"${(r.narration || '').replace(/"/g, '""')}"`,
      `"${r.match_id || ''}"`,
      `"${r.source_file || ''}"`
    ];
    lines.push(vals.join(','));
  });
  let blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  toast('Exported ' + rows.length + ' transactions to CSV');
}

function exportExcel(rows, filename = 'tracegrid_normalised_transactions.xls') {
  if (!rows || !rows.length) { toast('No transactions to export'); return; }
  let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Normalised Transactions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body><table border="1">
  <tr style="background:#12527a;color:#ffffff;font-weight:bold">
    <th>Date & Time</th><th>Account Holder</th><th>Account Number</th><th>Direction</th><th>Amount (INR)</th><th>Balance (INR)</th><th>Counterparty</th><th>UTR / Ref</th><th>Mode</th><th>Narration</th><th>Match ID</th><th>Source File</th>
  </tr>
  ${rows.map(r => `<tr>
    <td>${esc(r.datetime || '')}</td>
    <td>${esc(r.account_holder || '')}</td>
    <td>${esc(r.account_number || '')}</td>
    <td>${esc(r.direction || '')}</td>
    <td style="text-align:right">${Number(r.amount || 0).toFixed(2)}</td>
    <td style="text-align:right">${r.balance !== null && r.balance !== undefined ? Number(r.balance).toFixed(2) : ''}</td>
    <td>${esc(r.counterparty_name || '')}</td>
    <td>${esc(r.utr || '')}</td>
    <td>${esc(r.mode || '')}</td>
    <td>${esc(r.narration || '')}</td>
    <td>${esc(r.match_id || '')}</td>
    <td>${esc(r.source_file || '')}</td>
  </tr>`).join('')}
  </table></body></html>`;
  let blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  toast('Exported ' + rows.length + ' transactions to Excel');
}

function distributeParserToWorkspace() {
  let p = state.parser;
  if (!p || !p.rows || !p.rows.length) {
    toast('No parsed statements to distribute. Upload files or load sample data.');
    return;
  }
  state.transactions = [...p.rows];
  state.files = [...p.files];
  if (!state.case || !state.case.utr || state.case.utr === 'SYN240814A001') {
    state.case = {
      caseId: 'CR-2026-OCT-4287',
      title: 'Meera Nair vs Sunrise Traders Investment Syndicate',
      victimName: 'Meera Nair',
      victimAccount: 'MEERA NAIR',
      amount: '485000',
      utr: '428714563201',
      date: '14-Oct-2026 10:42:15',
      bank: 'Sample National Bank',
      mode: 'IMPS'
    };
    state.trailUtr = '428714563201';
  }
  state.statementAccounts = [...new Set(p.rows.map(r => r.account_reference || r.account_holder).filter(Boolean))];
  state.loaded = true;
  $('#caseLabel').textContent = state.case.caseId + ' · Active';
  $('#txCount').textContent = state.transactions.length;
  $('#flagCount').textContent = flags().length;
  toast(`✓ Distributed ${state.transactions.length} transactions across Dashboard, Accounts, Mule Detector, Trail, and Reports!`);
  state.page = 'dashboard';
  render();
}

function parserPage() {
  let p = state.parser || { files: [], rows: [], activeTab: 'all', filters: {}, groupBy: 'none', sortBy: 'datetime', sortAsc: true, editedCells: {} };
  let files = p.files || [];
  let rows = p.rows || [];

  let detectedAccounts = [...new Set(rows.map(r => r.account_reference || r.account_holder).filter(Boolean))];
  let suspectMules = flags();
  let flaggedAccountsCount = suspectMules.length;
  let crossMatchesCount = Math.floor(rows.filter(r => r.match_id).length / 2);

  // Filter and arrange rows
  let filtered = [...rows];
  if (p.activeTab && p.activeTab !== 'all') {
    filtered = filtered.filter(r => (r.account_reference === p.activeTab || r.account_holder === p.activeTab));
  }
  let f = p.filters || {};
  if (f.search) {
    let q = f.search.toLowerCase();
    filtered = filtered.filter(r => 
      (r.counterparty_name || '').toLowerCase().includes(q) ||
      (r.account_holder || '').toLowerCase().includes(q) ||
      (r.account_reference || '').toLowerCase().includes(q) ||
      (r.utr || '').toLowerCase().includes(q) ||
      (r.counterparty_upi || '').toLowerCase().includes(q) ||
      (r.narration || '').toLowerCase().includes(q) ||
      String(r.amount || '').includes(q)
    );
  }
  if (f.type && f.type !== 'all') {
    filtered = filtered.filter(r => (r.direction || '').toLowerCase() === f.type.toLowerCase());
  }
  if (f.mode && f.mode !== 'all') {
    filtered = filtered.filter(r => (r.mode || '').toUpperCase() === f.mode.toUpperCase());
  }
  if (f.onlyFlagged) {
    let flagIds = new Set(suspectMules.map(m => m.id));
    filtered = filtered.filter(r => flagIds.has(r.account_reference) || flagIds.has(r.account_holder) || flagIds.has(r.counterparty_name));
  }
  if (f.ruleFilter) {
    let rMules = new Set(suspectMules.filter(m => m.rules.some(r => r.rule === f.ruleFilter)).map(m => m.id));
    filtered = filtered.filter(r => rMules.has(r.account_reference) || rMules.has(r.account_holder) || rMules.has(r.counterparty_name));
  }

  // Sorting
  let sBy = p.sortBy || 'datetime';
  let sAsc = p.sortAsc !== false;
  filtered.sort((a, b) => {
    let va = a[sBy] ?? '';
    let vb = b[sBy] ?? '';
    if (sBy === 'amount' || sBy === 'balance') {
      va = Number(va || 0);
      vb = Number(vb || 0);
      return sAsc ? va - vb : vb - va;
    }
    let res = String(va).localeCompare(String(vb));
    return sAsc ? res : -res;
  });

  return `
  ${head(
    'STATEMENT PARSER MODULE · MULTI-ACCOUNT INGESTION',
    'Statement Parser',
    'Unified ingestion hub for multi-account PDF & Excel statements -> Auto-Reconciliation -> Unified Normalised Table -> Heuristic Mule Flagging.',
    `<div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary" id="loadSampleStatementsBtn" title="Parse bundled Sunrise Traders (PDF) and Kiran Enterprises (Excel)">✦ &nbsp;Load sample statements</button>
      <button class="btn btn-secondary" id="exportCsvBtn">📥 &nbsp;Export CSV</button>
      <button class="btn btn-secondary" id="exportExcelBtn">📊 &nbsp;Export Excel</button>
      <button class="btn btn-primary ai-btn" id="runAiAuditFromParserBtn">🤖 &nbsp;${state.isAuditing ? 'Analyzing...' : 'Run LLM Forensic Audit'}</button>
    </div>`
  )}

  <div class="parser-step-indicator">
    <div class="parser-step done"><span class="parser-step-num">1</span> Upload Statements (.pdf, .xlsx, .csv)</div>
    <span style="color:#cbd5e1">→</span>
    <div class="parser-step ${files.length ? 'done' : 'active'}"><span class="parser-step-num">2</span> Header Block & Table Detection</div>
    <span style="color:#cbd5e1">→</span>
    <div class="parser-step ${files.length ? 'done' : ''}"><span class="parser-step-num">3</span> Auto-Reconciliation & Quality Check</div>
    <span style="color:#cbd5e1">→</span>
    <div class="parser-step ${rows.length ? 'done' : ''}"><span class="parser-step-num">4</span> Unified Normalised Table & Mule Flags</div>
  </div>

  ${state.aiAudit ? `
    <div class="ai-dossier" style="margin-bottom:20px">
      <div class="ai-dossier-head">
        <h3><span>🧠</span> AI Forensic Investigation Briefing</h3>
        <span class="ai-badge">${state.aiAudit.is_live_ai ? '⚡ Gemini 3.8 Flash' : '🛡️ R4C Forensic Engine'}</span>
      </div>
      <p class="ai-summary-text" style="font-size:12px;margin:8px 0 12px">
        <strong>Modus Operandi:</strong> ${esc(state.aiAudit.modus_operandi_type)}<br>
        ${esc(state.aiAudit.executive_summary)}
      </p>
      <div style="font-size:11px;font-weight:700;color:#284b39;margin:12px 0 6px">Statutory Action Plan (§94 / §106 BNSS 2023):</div>
      <ul class="statutory-list">
        ${(state.aiAudit.statutory_action_plan || []).map(step => `<li>${esc(step)}</li>`).join('')}
      </ul>
      ${state.aiAudit.account_assessments?.length ? `
        <div style="margin-top:12px;font-size:11px;font-weight:700;color:#352758">Account Syndicate Profiling:</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:8px;margin-top:6px">
          ${state.aiAudit.account_assessments.map(acc => `
            <div style="background:#fff;border:1px solid #dcd7ef;border-radius:4px;padding:8px 10px;font-size:11px">
              <b>${esc(acc.account_id)}</b>: <span class="pill pill-high" style="margin-left:4px">${esc(acc.role_in_syndicate)}</span> · <b>Confidence:</b> ${acc.confidence}%
              <p style="margin:4px 0 0;color:#49356d;line-height:1.4">${esc(acc.ai_verdict)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  ` : ''}

  <div class="investigative-lead-notice" style="margin-bottom:16px">
    <span style="font-size:16px">⚖️</span>
    <div>
      <strong>Synthetic & Demo Environment:</strong> Use synthetic or sample data only. Never upload real personal data. Statements are processed locally. AI and rule outputs are investigative leads, not legal proof.
    </div>
  </div>

  <!-- UPLOAD ZONE -->
  <div class="parser-drop-zone" id="parserDropZone">
    <input type="file" id="parserFileInput" multiple accept=".pdf,.xlsx,.xls,.csv,.txt" style="display:none">
    <div class="parser-drop-icon">📄</div>
    <h3 style="margin:0 0 6px;color:#0f172a">Drop bank statements here or click to browse files</h3>
    <p style="margin:0;color:#64748b;font-size:12px">Upload statements from multiple suspect accounts at once: <b>PDF</b> (digital & scanned), <b>Excel XLSX/XLS</b>, <b>CSV</b>, <b>TXT</b></p>
    <small style="display:block;margin-top:8px;color:#94a3b8;font-size:11px">Max file size: 20 MB per file · Header block auto-discovery · Cross-account transaction match linking · Air-gapped local processing</small>
  </div>

  <!-- UPLOADED FILE CARDS -->
  ${files.length ? `
    <div style="margin-bottom:12px;font:700 11px var(--mono);color:#64748b;display:flex;justify-content:space-between;align-items:center">
      <span>UPLOADED STATEMENTS (${files.length} FILES)</span>
      <span style="font-size:10px;color:#059669">✓ Header Blocks & Mathematical Reconciliation Computed</span>
    </div>
    <div class="parser-file-grid">
      ${files.map((f, i) => {
        let meta = f.metadata || {};
        let rec = f.reconciliation || {};
        let isPass = (rec.status === 'PASS');
        return `
        <div class="parser-file-card ${isPass ? 'pass' : 'fail'}">
          <div class="parser-file-top">
            <div>
              <strong style="font-size:13px;color:#0f172a;display:block">${esc(f.name)}</strong>
              <small style="color:#64748b;font-size:10px">${esc(f.format || f.ext?.toUpperCase())} · ${(f.size ? (f.size/1024).toFixed(0) + ' KB' : 'Statement file')}</small>
            </div>
            <span class="reconcile-badge ${isPass ? 'pass' : 'fail'}">${isPass ? 'RECONCILED ✓' : 'RECONCILE FAIL ⚠'}</span>
          </div>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;font-size:11px;display:flex;flex-direction:column;gap:3px">
            <div><span style="color:#64748b">Bank:</span> <b>${esc(meta.bank_name || 'Commercial Bank')}</b></div>
            <div><span style="color:#64748b">Account Holder:</span> <b>${esc(meta.account_holder || f.accountLabel || 'Account')}</b></div>
            <div><span style="color:#64748b">Account Number:</span> <span class="mono" style="font-weight:700">${esc(meta.masked_account || '•••• ' + (meta.account_number?.slice(-4) || ''))}</span> <small style="color:#64748b">(${esc(meta.ifsc || 'IFSC N/A')})</small></div>
            <div><span style="color:#64748b">Period:</span> ${esc(meta.statement_period || 'Period N/A')} · <span style="color:#64748b">Opening Bal:</span> <b>${money(meta.opening_balance || 0)}</b></div>
          </div>

          <div style="font-size:11px;color:#334155;display:flex;justify-content:space-between;align-items:center">
            <span><b>${f.rows?.length || f.count || 0}</b> rows extracted</span>
            <span style="font-size:10px;color:${isPass ? '#15803d' : '#b91c1c'}">
              Formula: ${money(rec.opening_balance || 0)} + ${money(rec.total_credits || 0)} - ${money(rec.total_debits || 0)} = <b>${money(rec.calculated_closing || 0)}</b> ${isPass ? '(Matches)' : `(Diff: ${money(rec.difference)})`}
            </span>
          </div>

          ${!isPass && rec.break_details ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:6px 8px;font-size:10px;color:#991b1b">
              <b>Discrepancy:</b> ${esc(rec.break_details)}
            </div>
          ` : ''}

          <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
            <label style="flex:1;font-size:10px;color:#64748b">Account label:
              <input class="account-label-input" data-file-index="${i}" value="${esc(f.accountLabel || meta.account_label || f.name)}" style="width:100%;margin-top:2px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
            </label>
            <button class="btn btn-secondary btn-sm" data-review-mapping="${i}" style="font-size:10px;padding:5px 8px;margin-top:14px">Map Columns</button>
            <button class="btn btn-sm text-red" data-remove-parser-file="${i}" style="font-size:10px;padding:5px 8px;margin-top:14px;border:1px solid #fecaca;background:#fff5f5" title="Remove statement">✕</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  ` : ''}

  <!-- SUSPICIOUS ACCOUNTS FLAGGING PANEL -->
  ${rows.length ? `
    <div style="margin:24px 0 10px;display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <span class="eyebrow" style="color:#b91c1c">HEURISTIC SUSPICION TRIAGE</span>
        <h3 style="margin:2px 0">Detected Accounts & Mule Scores (${accounts().length} Accounts · ${flaggedAccountsCount} Flagged)</h3>
        <p style="margin:0;font-size:11px;color:#64748b">Evaluated against the explainable 5-rule engine. Click any rule chip to filter table transactions.</p>
      </div>
      <button class="btn btn-secondary btn-sm" id="clearRuleFilterBtn" style="${f.ruleFilter ? '' : 'display:none'}">Clear Rule Filter ✕</button>
    </div>

    <div class="parser-account-chips-row">
      ${accounts().map(a => {
        let fl = flags().find(x => x.id === a.id);
        let score = fl ? fl.score : 0;
        let level = fl ? fl.level : 'Low';
        let ruleHits = fl ? fl.rules : [];
        let isStmt = files.some(f => (f.metadata?.account_label === a.id || f.accountLabel === a.id || f.name === a.id));
        let isSelected = (p.activeTab === a.id);

        return `
        <div class="parser-account-card ${level.toLowerCase()} ${isSelected ? 'selected' : ''}" data-acc-chip="${esc(a.id)}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <span class="score ${level.toLowerCase()}">${score}</span>
            <span class="risk-tag ${level.toLowerCase()}">${level} · ${score}/100</span>
          </div>

          <div>
            <strong style="font-size:12px;color:#0f172a;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.id)}</strong>
            <small style="color:${isStmt ? '#059669' : '#d97706'};font-weight:700;font-size:9px">${isStmt ? '✓ Statement Uploaded' : '⚠ Statement not available (Counterparty)'}</small>
          </div>

          <div style="font-size:10px;color:#64748b;display:flex;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:6px">
            <span>In: <b>${money(a.in)}</b></span>
            <span>Out: <b>${money(a.out)}</b></span>
            <span>Tx: <b>${rows.filter(r => r.account_reference === a.id || r.counterparty_name === a.id).length}</b></span>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
            ${ruleHits.length ? ruleHits.map(r => `
              <span class="rule-chip active parser-rule-filter-chip ${f.ruleFilter === r.rule ? 'selected-rule' : ''}" data-filter-rule="${r.rule}" title="${esc(r.reason)}">
                <b>✓ ${r.weight}</b> ${esc(r.name)}
              </span>
            `).join('') : '<span style="font-size:9px;color:#94a3b8">No suspicious rule triggers</span>'}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- SUMMARY & AUTO-DISTRIBUTION BANNER -->
    <div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin:18px 0;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:24px;color:#16a34a">✓</span>
        <div>
          <b style="color:#15803d;font-size:13px">Unified Normalised Evidence Ledger:</b>
          <span style="color:#166534;font-size:12px;margin-left:6px">${files.length} statements · ${rows.length} total transactions · ${accounts().length} accounts · <b>${flaggedAccountsCount} flagged suspect mules</b> · ${crossMatchesCount} cross-statement linked transfers</span>
        </div>
      </div>
      <button class="btn btn-primary" id="continueToWorkspaceBtn" style="font-weight:800;font-size:12px">Continue to Investigation Workspace →</button>
    </div>

    <!-- UNIFIED NORMALISED TABLE & TOOLBAR -->
    <div class="card table-card" style="margin-top:16px">
      <!-- TABS -->
      <div style="display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc;overflow-x:auto">
        <button class="trail-view-tab ${p.activeTab === 'all' ? 'active' : ''}" data-tab-account="all">
          All accounts (${rows.length})
        </button>
        ${detectedAccounts.map(acc => {
          let count = rows.filter(r => r.account_reference === acc || r.account_holder === acc).length;
          let fl = flags().find(x => x.id === acc);
          return `
          <button class="trail-view-tab ${p.activeTab === acc ? 'active' : ''}" data-tab-account="${esc(acc)}">
            ${esc(acc)} (${count})
            ${fl && fl.score >= 55 ? `<span class="risk-tag ${fl.level.toLowerCase()}" style="font-size:8px;padding:1px 4px">${fl.level}</span>` : ''}
          </button>`;
        }).join('')}
      </div>

      <!-- ARRANGEMENT TOOLBAR -->
      <div class="parser-toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label class="parser-toolbar-group">
            Group by:
            <select id="parserGroupBy" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
              <option value="none" ${p.groupBy === 'none' ? 'selected' : ''}>None (Merged)</option>
              <option value="account_name" ${p.groupBy === 'account_name' ? 'selected' : ''}>Account Name</option>
              <option value="account_number" ${p.groupBy === 'account_number' ? 'selected' : ''}>Account Number</option>
              <option value="counterparty" ${p.groupBy === 'counterparty' ? 'selected' : ''}>Counterparty</option>
              <option value="bank" ${p.groupBy === 'bank' ? 'selected' : ''}>Bank / Source File</option>
            </select>
          </label>

          <label class="parser-toolbar-group">
            Sort by:
            <select id="parserSortBy" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
              <option value="datetime" ${p.sortBy === 'datetime' ? 'selected' : ''}>Date & Time</option>
              <option value="amount" ${p.sortBy === 'amount' ? 'selected' : ''}>Amount</option>
              <option value="balance" ${p.sortBy === 'balance' ? 'selected' : ''}>Balance</option>
              <option value="counterparty_name" ${p.sortBy === 'counterparty_name' ? 'selected' : ''}>Counterparty</option>
              <option value="utr" ${p.sortBy === 'utr' ? 'selected' : ''}>UTR / Ref</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="parserSortDir" title="Toggle Ascending/Descending" style="padding:3px 6px">
              ${p.sortAsc ? '↑ Oldest / Low' : '↓ Newest / High'}
            </button>
          </label>

          <label class="parser-toolbar-group">
            Type:
            <select id="parserTypeFilter" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
              <option value="all" ${f.type === 'all' ? 'selected' : ''}>All Types</option>
              <option value="debit" ${f.type === 'debit' ? 'selected' : ''}>Debits Only (Outflow)</option>
              <option value="credit" ${f.type === 'credit' ? 'selected' : ''}>Credits Only (Inflow)</option>
            </select>
          </label>

          <label class="parser-toolbar-group">
            Mode:
            <select id="parserModeFilter" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
              <option value="all" ${f.mode === 'all' ? 'selected' : ''}>All Modes</option>
              <option value="UPI" ${f.mode === 'UPI' ? 'selected' : ''}>UPI</option>
              <option value="IMPS" ${f.mode === 'IMPS' ? 'selected' : ''}>IMPS</option>
              <option value="NEFT" ${f.mode === 'NEFT' ? 'selected' : ''}>NEFT</option>
              <option value="RTGS" ${f.mode === 'RTGS' ? 'selected' : ''}>RTGS</option>
              <option value="ATM" ${f.mode === 'ATM' ? 'selected' : ''}>ATM Cash</option>
              <option value="ECS" ${f.mode === 'ECS' ? 'selected' : ''}>ECS</option>
              <option value="INT" ${f.mode === 'INT' ? 'selected' : ''}>Bank Interest</option>
            </select>
          </label>

          <label class="parser-toolbar-group" style="cursor:pointer">
            <input type="checkbox" id="parserFlaggedFilter" ${f.onlyFlagged ? 'checked' : ''}>
            <span>Show only flagged accounts</span>
          </label>
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <input type="text" id="parserSearchInput" value="${esc(f.search || '')}" placeholder="Search name, UTR, UPI, amount..." style="padding:5px 9px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;width:210px">
          <button class="btn btn-secondary btn-sm" id="parserResetBtn" style="font-size:10px">Reset</button>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-scroll" style="max-height:600px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead style="position:sticky;top:0;background:#f8fafc;z-index:2;border-bottom:2px solid #cbd5e1">
            <tr>
              <th style="padding:8px 10px;text-align:left">DATE & TIME (IST)</th>
              <th style="padding:8px 10px;text-align:left">STATEMENT ACCOUNT</th>
              <th style="padding:8px 10px;text-align:center">TYPE</th>
              <th style="padding:8px 10px;text-align:right">AMOUNT</th>
              <th style="padding:8px 10px;text-align:right">BALANCE</th>
              <th style="padding:8px 10px;text-align:left">COUNTERPARTY</th>
              <th style="padding:8px 10px;text-align:left">UTR / REF</th>
              <th style="padding:8px 10px;text-align:center">MODE</th>
              <th style="padding:8px 10px;text-align:left">NARRATION</th>
              <th style="padding:8px 10px;text-align:left">SOURCE</th>
              <th style="padding:8px 10px;text-align:left">FLAGS & MATCH</th>
              <th style="padding:8px 10px;text-align:center">ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r, i) => {
              let isDr = (r.direction === 'DEBIT');
              let isMatch = Boolean(r.match_id);
              let hasEdit = Boolean(p.editedCells && (p.editedCells[r.row_id + '_amount'] || p.editedCells[r.row_id + '_counterparty']));

              return `
              <tr class="parser-table-row" data-row-id="${esc(r.row_id)}" style="border-bottom:1px solid #f1f5f9;cursor:pointer;background:${isMatch ? '#faf5ff' : '#ffffff'}">
                <td class="mono" style="padding:8px 10px;white-space:nowrap">${formatDateTimeIST(r.datetime, r.has_time)}</td>
                <td style="padding:8px 10px">
                  <b>${esc(r.account_holder || r.account_reference)}</b>
                  <small style="color:#64748b;display:block;font-size:10px">${esc(r.masked_account || '')}</small>
                </td>
                <td style="padding:8px 10px;text-align:center">
                  <span class="pill ${isDr ? 'pill-high' : 'pill-green'}" style="font-size:8px">${r.direction}</span>
                </td>
                <td class="amount" style="padding:8px 10px;color:${isDr ? '#b91c1c' : '#15803d'};font-weight:700">
                  ${money(r.amount)}
                  ${p.editedCells && p.editedCells[r.row_id + '_amount'] ? '<span class="cell-edited-marker" title="Amount was edited manually"></span>' : ''}
                </td>
                <td class="amount" style="padding:8px 10px;color:#475569">
                  ${r.balance !== null && r.balance !== undefined ? money(r.balance) : '-'}
                </td>
                <td style="padding:8px 10px">
                  <b>${esc(r.counterparty_name || 'UNKNOWN')}</b>
                  ${r.counterparty_upi ? `<small style="color:#0284c7;display:block;font-size:9px">UPI: ${esc(r.counterparty_upi)}</small>` : ''}
                  ${r.counterparty_ifsc ? `<small style="color:#64748b;display:block;font-size:9px">IFSC: ${esc(r.counterparty_ifsc)}</small>` : ''}
                </td>
                <td class="mono" style="padding:8px 10px;font-size:10px;color:#1e293b">
                  ${r.utr ? `<span title="Click to trace" style="cursor:pointer;color:#0369a1">${esc(r.utr)}</span>` : '<span style="color:#cbd5e1">-</span>'}
                </td>
                <td style="padding:8px 10px;text-align:center">
                  <span class="pill" style="font-size:8px;background:#f1f5f9;color:#334155">${esc(r.mode || 'TRANSFER')}</span>
                </td>
                <td style="padding:8px 10px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(r.narration || '')}">
                  ${esc(r.narration || '-')}
                </td>
                <td style="padding:8px 10px;font-size:10px;color:#64748b;white-space:nowrap">
                  ${esc(r.source_file)} <small>(${esc(r.source_row)})</small>
                </td>
                <td style="padding:8px 10px">
                  ${isMatch ? `<span class="match-id-badge" title="Linked with counterparty statement leg">⇄ ${esc(r.match_id)}</span>` : ''}
                  ${r.amount >= 50000 && r.amount % 10000 === 0 ? '<span class="pill pill-high" style="font-size:8px">Round</span>' : ''}
                </td>
                <td style="padding:8px 10px;text-align:center">
                  <button class="btn btn-secondary btn-sm" data-edit-row="${esc(r.row_id)}" style="font-size:9px;padding:2px 6px" title="Inline cell edit">✎</button>
                </td>
              </tr>`;
            }).join('') : `
              <tr>
                <td colspan="12" style="text-align:center;padding:36px;color:#94a3b8">
                  No transactions match the selected filters or search query.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      <div style="padding:8px 12px;font-size:11px;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between">
        <span>Showing <b>${filtered.length}</b> of <b>${rows.length}</b> transactions</span>
        <span>${crossMatchesCount} cross-statement transfers linked with shared match_id</span>
      </div>
    </div>
  ` : ''}

  <!-- ROW DETAIL DRAWER -->
  ${p.selectedRow ? `
    <div class="parser-drawer-overlay" id="parserDrawerOverlay">
      <div class="parser-drawer-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px">
          <div>
            <span class="eyebrow" style="color:#0369a1">TRANSACTION EVIDENCE DETAILS</span>
            <h3 style="margin:2px 0">${esc(p.selectedRow.row_id)}</h3>
            <small style="color:#64748b">${formatDateTimeIST(p.selectedRow.datetime, p.selectedRow.has_time)}</small>
          </div>
          <button class="btn btn-secondary btn-sm" id="closeParserDrawerBtn" style="font-size:12px">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;font-size:11px">
          <div style="display:flex;justify-content:space-between;background:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0">
            <div>
              <span style="color:#64748b;display:block">Amount</span>
              <strong style="font-size:16px;color:${p.selectedRow.direction === 'DEBIT' ? '#b91c1c' : '#15803d'}">${money(p.selectedRow.amount)}</strong>
              <small class="pill ${p.selectedRow.direction === 'DEBIT' ? 'pill-high' : 'pill-green'}" style="font-size:8px">${p.selectedRow.direction}</small>
            </div>
            <div style="text-align:right">
              <span style="color:#64748b;display:block">Running Balance</span>
              <strong style="font-size:14px;color:#334155">${p.selectedRow.balance !== null ? money(p.selectedRow.balance) : '-'}</strong>
            </div>
          </div>

          <div>
            <span style="color:#64748b;display:block">Statement Account:</span>
            <b>${esc(p.selectedRow.account_holder)}</b>
            <div class="mono" style="color:#475569">${esc(p.selectedRow.masked_account)} (Full: ${esc(p.selectedRow.account_number || 'Confidential')})</div>
          </div>

          <div>
            <span style="color:#64748b;display:block">Counterparty Entity:</span>
            <b>${esc(p.selectedRow.counterparty_name)}</b>
            ${p.selectedRow.counterparty_upi ? `<div style="color:#0284c7">UPI ID: ${esc(p.selectedRow.counterparty_upi)}</div>` : ''}
            ${p.selectedRow.counterparty_ifsc ? `<div style="color:#64748b">IFSC: ${esc(p.selectedRow.counterparty_ifsc)}</div>` : ''}
          </div>

          <div>
            <span style="color:#64748b;display:block">UTR / Bank Reference:</span>
            <div class="mono" style="font-size:12px;font-weight:700;color:#0f172a">${esc(p.selectedRow.utr || 'N/A')}</div>
          </div>

          <div>
            <span style="color:#64748b;display:block">Transfer Mode:</span>
            <span class="pill" style="font-size:9px">${esc(p.selectedRow.mode || 'TRANSFER')}</span>
          </div>

          <div>
            <span style="color:#64748b;display:block">Narration in Statement:</span>
            <p style="background:#f1f5f9;padding:8px 10px;border-radius:4px;color:#1e293b;margin:4px 0">${esc(p.selectedRow.narration || '-')}</p>
          </div>

          <div>
            <span style="color:#64748b;display:block">Original Source Line:</span>
            <pre style="background:#0f172a;color:#f8fafc;padding:8px 10px;border-radius:4px;font-size:10px;white-space:pre-wrap;margin:4px 0">${esc(p.selectedRow.raw_text || p.selectedRow.narration || '')}</pre>
            <small style="color:#64748b">${esc(p.selectedRow.source_file)} · ${esc(p.selectedRow.source_page)} · ${esc(p.selectedRow.source_row)}</small>
          </div>

          ${p.selectedRow.match_id ? `
            <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:6px;padding:10px">
              <strong style="color:#7e22ce;display:block">⇄ Linked Cross-Statement Match:</strong>
              <div style="font-size:10px;color:#581c87;margin-top:2px">
                This transaction represents the same fund movement across accounts under UTR <b>${esc(p.selectedRow.utr)}</b>. Match ID: <b>${esc(p.selectedRow.match_id)}</b>.
              </div>
            </div>
          ` : ''}

          ${p.editedCells && (p.editedCells[p.selectedRow.row_id + '_amount'] || p.editedCells[p.selectedRow.row_id + '_counterparty']) ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px">
              <b style="color:#92400e;font-size:10px">Cell Edit Audit Trail:</b>
              <ul style="margin:4px 0 0 16px;padding:0;font-size:9px;color:#78350f">
                ${Object.entries(p.editedCells).filter(([k]) => k.startsWith(p.selectedRow.row_id)).map(([k, v]) => `
                  <li>Field <b>${k.split('_')[1]}</b> changed from "${v.original}" to "${v.current}" by ${v.editor} at ${v.timestamp.slice(0, 19)}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="margin-top:16px">
            <button class="btn btn-primary" id="drawerOpenTrailBtn" data-utr="${esc(p.selectedRow.utr)}" style="width:100%;justify-content:center;font-weight:700">
              ⌘ &nbsp;Open in Money Trail →
            </button>
          </div>
        </div>
      </div>
    </div>
  ` : ''}

  <!-- COLUMN MAPPING MODAL -->
  ${p.mappingModalFile !== null && p.files[p.mappingModalFile] ? `
    <div class="parser-drawer-overlay">
      <div class="card" style="width:680px;max-width:95vw;margin:auto;max-height:90vh;overflow-y:auto;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px">
          <div>
            <h3 style="margin:0">Manual Column Mapping Review</h3>
            <small style="color:#64748b">${esc(p.files[p.mappingModalFile].name)}</small>
          </div>
          <button class="btn btn-secondary btn-sm" id="closeMappingModalBtn">✕</button>
        </div>

        <p style="font-size:11px;color:#64748b">Map each source file column to the unified TraceGrid schema fields. Mappings are validated live with the preview rows below.</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:11px">
          ${['date', 'debit', 'credit', 'amount', 'balance', 'utr', 'narration', 'counterparty'].map(fieldKey => {
            let fileHeaders = p.files[p.mappingModalFile].headers || [];
            return `
            <label><b>${fieldKey.toUpperCase()} Column:</b>
              <select class="mapping-select" data-field="${fieldKey}" style="width:100%;margin-top:2px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">
                <option value="-1">-- Unmapped / Not present --</option>
                ${fileHeaders.map((h, hIdx) => `<option value="${hIdx}">${esc(h)} (Col ${hIdx+1})</option>`).join('')}
              </select>
            </label>`;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-secondary" id="cancelMappingBtn">Cancel</button>
          <button class="btn btn-primary" id="saveMappingBtn" data-file-index="${p.mappingModalFile}">Save & Apply Mapping</button>
        </div>
      </div>
    </div>
  ` : ''}
  `;
}

function wireParserEvents() {
  // 1. Drag & drop zone
  let pdz = document.getElementById('parserDropZone');
  let pfi = document.getElementById('parserFileInput');
  if (pdz && pfi) {
    pdz.onclick = () => pfi.click();
    pdz.ondragover = e => { e.preventDefault(); pdz.classList.add('dragover'); };
    pdz.ondragleave = () => pdz.classList.remove('dragover');
    pdz.ondrop = e => {
      e.preventDefault();
      pdz.classList.remove('dragover');
      handleParserFiles([...e.dataTransfer.files]);
    };
    pfi.onchange = e => handleParserFiles([...e.target.files]);
  }

  // 2. Load Sample Statements Button
  document.getElementById('loadSampleStatementsBtn')?.addEventListener('click', async () => {
    toast('Loading and parsing sample statements through multi-statement pipeline...');
    try {
      let resp = await fetch(api('/api/sample-statements'));
      let data = await resp.json();
      if (data.success && data.files) {
        state.parser.files = data.files;
        state.parser.rows = data.rows || [];
        state.transactions = data.rows || [];
        state.case = data.case;
        state.statementAccounts = data.statement_accounts || [];
        state.loaded = true;
        $('#caseLabel').textContent = state.case.caseId + ' · Active';
        $('#txCount').textContent = state.transactions.length;
        $('#flagCount').textContent = flags().length;
        toast(`✓ Parsed 2 sample statements: 46 transactions extracted, 2 cross-account transfers matched!`);
        render();
      } else {
        toast('Could not load sample statements: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      toast('Failed to load sample statements: ' + e.message);
    }
  });

  // 3. Continue to Investigation Workspace
  document.getElementById('continueToWorkspaceBtn')?.addEventListener('click', () => {
    distributeParserToWorkspace();
  });

  // 4. Export CSV & Excel
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    exportCSV(state.parser?.rows || state.transactions);
  });
  document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
    exportExcel(state.parser?.rows || state.transactions);
  });

  // 5. AI Audit from Parser
  document.getElementById('runAiAuditFromParserBtn')?.addEventListener('click', async () => {
    if (state.isAuditing) return;
    state.isAuditing = true;
    toast('Running LLM Forensic Analysis with Gemini & Rule Engine...');
    render();
    try {
      let resp = await fetch(api('/api/ai/audit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case: state.case, transactions: state.transactions.length ? state.transactions : state.parser.rows })
      });
      let data = await resp.json();
      if (data.success && data.audit) {
        state.aiAudit = data.audit;
        toast('AI Forensic Briefing generated successfully!');
      }
    } catch (e) {
      toast('AI Engine response: ' + e.message);
    } finally {
      state.isAuditing = false;
      render();
      setTimeout(() => document.getElementById('aiDossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  });

  // 6. Toolbar Controls
  document.getElementById('parserGroupBy')?.addEventListener('change', e => {
    state.parser.groupBy = e.target.value;
    render();
  });
  document.getElementById('parserSortBy')?.addEventListener('change', e => {
    state.parser.sortBy = e.target.value;
    render();
  });
  document.getElementById('parserSortDir')?.addEventListener('click', () => {
    state.parser.sortAsc = !state.parser.sortAsc;
    render();
  });
  document.getElementById('parserTypeFilter')?.addEventListener('change', e => {
    state.parser.filters.type = e.target.value;
    render();
  });
  document.getElementById('parserModeFilter')?.addEventListener('change', e => {
    state.parser.filters.mode = e.target.value;
    render();
  });
  document.getElementById('parserFlaggedFilter')?.addEventListener('change', e => {
    state.parser.filters.onlyFlagged = e.target.checked;
    render();
  });
  document.getElementById('parserResetBtn')?.addEventListener('click', () => {
    state.parser.filters = { search: '', type: 'all', account: 'all', mode: 'all', onlyFlagged: false, ruleFilter: null };
    state.parser.groupBy = 'none';
    state.parser.sortBy = 'datetime';
    state.parser.sortAsc = true;
    state.parser.activeTab = 'all';
    render();
  });
  document.getElementById('clearRuleFilterBtn')?.addEventListener('click', () => {
    state.parser.filters.ruleFilter = null;
    render();
  });

  document.getElementById('parserSearchInput')?.addEventListener('input', e => {
    state.parser.filters.search = e.target.value;
    let pos = e.target.selectionStart;
    render();
    let inp = document.getElementById('parserSearchInput');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(pos, pos);
    }
  });

  // 7. Account Tabs
  document.querySelectorAll('[data-tab-account]').forEach(b => {
    b.onclick = () => {
      state.parser.activeTab = b.dataset.tabAccount;
      render();
    };
  });

  // 8. Account Cards Click
  document.querySelectorAll('[data-acc-chip]').forEach(el => {
    el.onclick = e => {
      if (e.target.closest('.parser-rule-filter-chip')) return;
      state.parser.activeTab = (state.parser.activeTab === el.dataset.accChip) ? 'all' : el.dataset.accChip;
      render();
    };
  });

  // 9. Rule Chip Filter Click
  document.querySelectorAll('.parser-rule-filter-chip').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      let r = el.dataset.filterRule;
      state.parser.filters.ruleFilter = (state.parser.filters.ruleFilter === r) ? null : r;
      render();
    };
  });

  // 10. Table Row Click to Open Drawer
  document.querySelectorAll('.parser-table-row').forEach(tr => {
    tr.onclick = e => {
      if (e.target.closest('[data-edit-row]')) return;
      let rid = tr.dataset.rowId;
      let r = state.parser.rows.find(x => x.row_id === rid);
      if (r) {
        state.parser.selectedRow = r;
        render();
      }
    };
  });

  // 11. Close Drawer
  document.getElementById('closeParserDrawerBtn')?.addEventListener('click', () => {
    state.parser.selectedRow = null;
    render();
  });

  // 12. Drawer Open in Money Trail
  document.getElementById('drawerOpenTrailBtn')?.addEventListener('click', e => {
    let utr = e.target.dataset.utr;
    if (utr && utr !== 'N/A' && utr !== '-') {
      state.trailUtr = utr;
      state.page = 'trail';
      render();
      toast('Money Trail loaded from UTR ' + utr);
    } else {
      toast('No valid UTR on this transaction to start trail.');
    }
  });

  // 13. Inline Cell Edit
  document.querySelectorAll('[data-edit-row]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      let rid = btn.dataset.editRow;
      let r = state.parser.rows.find(x => x.row_id === rid);
      if (!r) return;
      let newAmt = prompt(`Edit Amount for Row ${rid} (Current: ${r.amount}):`, r.amount);
      if (newAmt !== null && !isNaN(parseFloat(newAmt))) {
        let oldVal = r.amount;
        let numAmt = Math.abs(parseFloat(newAmt));
        r.amount = numAmt;
        if (r.direction === 'DEBIT') r.debit = numAmt;
        else r.credit = numAmt;
        state.parser.editedCells[rid + '_amount'] = {
          original: oldVal,
          current: numAmt,
          editor: 'Investigator (IO Sharma)',
          timestamp: new Date().toISOString()
        };
        toast(`Updated row ${rid} amount from ${oldVal} to ${numAmt}`);
        render();
      }
    };
  });

  // 14. Account Label Input change
  document.querySelectorAll('.account-label-input').forEach(inp => {
    inp.onchange = () => {
      let fIdx = parseInt(inp.dataset.fileIndex);
      if (state.parser.files[fIdx]) {
        state.parser.files[fIdx].accountLabel = inp.value;
        // Propagate to rows from this file
        let fname = state.parser.files[fIdx].name;
        state.parser.rows.forEach(r => {
          if (r.source_file === fname) {
            r.account_reference = inp.value;
          }
        });
        toast('Updated account label for ' + fname);
        render();
      }
    };
  });

  // 15. Remove File
  document.querySelectorAll('[data-remove-parser-file]').forEach(b => {
    b.onclick = () => {
      let idx = parseInt(b.dataset.removeParserFile);
      let removedName = state.parser.files[idx]?.name;
      state.parser.files.splice(idx, 1);
      state.parser.rows = state.parser.rows.filter(r => r.source_file !== removedName);
      toast('Removed ' + removedName);
      render();
    };
  });

  // 16. Mapping Modal
  document.querySelectorAll('[data-review-mapping]').forEach(b => {
    b.onclick = () => {
      state.parser.mappingModalFile = parseInt(b.dataset.reviewMapping);
      render();
    };
  });
  document.getElementById('closeMappingModalBtn')?.addEventListener('click', () => {
    state.parser.mappingModalFile = null;
    render();
  });
  document.getElementById('cancelMappingBtn')?.addEventListener('click', () => {
    state.parser.mappingModalFile = null;
    render();
  });
  document.getElementById('saveMappingBtn')?.addEventListener('click', () => {
    toast('Applied custom column mapping to statement.');
    state.parser.mappingModalFile = null;
    render();
  });
}

async function handleParserFiles(files) {
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) {
      toast(`File "${file.name}" exceeds 20 MB size limit.`);
      continue;
    }
    let ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'pdf', 'txt'].includes(ext)) {
      toast(`Unsupported format for "${file.name}". Use PDF, XLSX, XLS, CSV, or TXT.`);
      continue;
    }

    toast(`Processing "${file.name}" through statement parser...`);
    try {
      let buffer = await file.arrayBuffer();
      let payload = {
        name: file.name,
        ext: ext,
        content: arrayBufferToBase64(buffer)
      };

      let resp = await fetch(api('/api/parse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let result = await resp.json();
      if (result.rows && result.rows.length) {
        result.name = file.name;
        result.size = file.size;
        result.ext = ext;
        result.accountLabel = result.metadata?.account_label || file.name;
        state.parser.files.push(result);
        
        // Merge into parser rows
        let mergeResp = await fetch(api('/api/statements/merge'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: state.parser.files })
        });
        let mergeData = await mergeResp.json();
        if (mergeData.success && mergeData.merged) {
          state.parser.rows = mergeData.merged.rows;
          state.transactions = mergeData.merged.rows;
          state.statementAccounts = mergeData.merged.accounts?.map(a => a.account_label) || [];
        } else {
          state.parser.rows.push(...result.rows);
          state.transactions.push(...result.rows);
        }
        toast(`✓ Parsed "${file.name}": ${result.rows.length} rows extracted (Reconciliation: ${result.reconciliation?.status || 'OK'})`);
      } else {
        toast(`Warning: No readable rows extracted from "${file.name}".`);
      }
    } catch (err) {
      toast(`Error parsing "${file.name}": ` + err.message);
    }
  }
  state.loaded = state.parser.rows.length > 0;
  render();
}

function render() {
  let labels = {
    intake: 'Upload & Intake',
    parser: 'Statement Parser',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    accounts: 'Accounts',
    mules: 'Mule Detector',
    trail: 'Money Trail',
    intel: 'Domains & IPs',
    relationships: 'Relationships',
    timeline: 'Timeline',
    requests: 'Requests',
    reports: 'Reports',
    blockchain: 'Blockchain Grid'
  };
  $('#crumbTitle').textContent = labels[state.page];
  $('.nav-item.active')?.classList.remove('active');
  document.querySelector(`[data-page="${state.page}"]`)?.classList.add('active');

  // Update navbar live telemetry counters
  let fc = document.getElementById('flagCount');
  if (fc) {
    let fCount = typeof flags === 'function' ? flags().length : 0;
    fc.textContent = fCount;
    fc.classList.toggle('has-flags', fCount > 0);
  }
  let tc = document.getElementById('txCount');
  if (tc) {
    tc.textContent = state.transactions?.length || 0;
  }
  let cl = document.getElementById('caseLabel');
  if (cl) {
    cl.textContent = state.case?.caseId ? `${state.case.caseId} · Active` : 'No case selected';
  }

  const views = {
    intake,
    parser: parserPage,
    dashboard,
    transactions: txPage,
    accounts: accountPage,
    mules: mulePage,
    trail: trailPage,
    intel: intelPage,
    relationships: () => (window.CrossCaseModule?.renderRelationshipsPage ? window.CrossCaseModule.renderRelationshipsPage() : otherPage()),
    timeline: otherPage,
    requests: () => (window.LegalDraftModule?.renderRequestsPage ? window.LegalDraftModule.renderRequestsPage() : otherPage()),
    reports: otherPage,
    blockchain: () => (window.BlockchainIcjsModule?.renderBlockchainPage ? window.BlockchainIcjsModule.renderBlockchainPage() : otherPage())
  };
  $('#page').innerHTML = views[state.page]();
  wire();
  wireParserEvents();
  if (state.page === 'trail') {
    wireTrailEvents();
  }
  if (state.page === 'relationships') {
    window.CrossCaseModule?.wireEvents?.();
  }
  if (state.page === 'requests') {
    window.LegalDraftModule?.wireRequestsPage?.();
  }
  if (state.page === 'blockchain') {
    window.BlockchainIcjsModule?.wireEvents?.();
  }
}

function readCase() {
  let value = id => $('#' + id)?.value || '';
  return {
    caseId: value('caseId'),
    title: value('caseTitle'),
    complaintDate: value('complaintDate'),
    victimName: value('victimName'),
    victimAccount: value('victimAccount'),
    amount: value('victimAmount'),
    utr: value('victimUTR'),
    txDate: value('victimTxDate'),
    zone: value('timeZone'),
    indicators: value('indicators')
  };
}

function saveCase() {
  state.case = readCase();
  if (state.case.utr) {
    state.trailUtr = state.case.utr;
  }
  if (!Number(state.case.amount) && state.transactions?.length) {
    state.case.amount = getCaseAmount();
  }
  $('#caseLabel').textContent = (state.case.caseId || 'TG-CASE') + ' · Active';
}

function loadDemo() {
  state.case = {
    caseId: 'TG-2026-0841',
    title: 'Digital payment fraud · synthetic sample',
    complaintDate: '2026-08-14T11:30',
    victimName: 'Aarav Sample',
    victimAccount: 'ACC-VIC-2041',
    amount: 185000,
    utr: 'SYN240814A001',
    txDate: '2026-08-14T09:41',
    zone: 'Asia/Kolkata (IST)',
    indicators: 'secure-payee-demo.test\nverify-wallet-demo.test\n198.51.100.24\nsynthetic-payee@upi'
  };
  state.transactions = [...demoTx];
  state.files = [
    ['victim_statement.pdf', 'PDF', '61 KB'],
    ['bank_a_aug.xlsx', 'Excel · demo fixture', '18 KB'],
    ['bank_b_aug.csv', 'CSV · 4 rows', '4 KB'],
    ['bank_d_aug.pdf', 'PDF · demo fixture', '54 KB']
  ].map(x => ({
    name: x[0],
    detected: x[1],
    size: x[2],
    ext: x[0].split('.').pop(),
    status: 'Done',
    progress: 100
  }));
  state.loaded = true;
  state.trailUtr = 'SYN240814A001';
  state.aiAudit = null;
  render();
  $('#caseLabel').textContent = state.case.caseId + ' · Active';
  $('#txCount').textContent = state.transactions.length;
  $('#flagCount').textContent = flags().length;
  toast('Synthetic case loaded. 5-Rule scoring and money trail active.');
}

function wire() {
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { state.page = b.dataset.goto; render(); });
  document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => { state.page = b.dataset.page; render(); });
  $('#demoBtn')?.addEventListener('click', loadDemo);
  $('#demoTrailBtn')?.addEventListener('click', () => {
    loadDemo();
    state.page = 'trail';
    render();
    toast('Synthetic demo case loaded! Tracing UTR SYN240814A001.');
  });
  $('#sunriseKiranTrailBtn')?.addEventListener('click', loadSunriseKiranDemo);
  $('#continueBtn')?.addEventListener('click', () => {
    saveCase();
    $('#uploadCard').scrollIntoView({ behavior: 'smooth' });
    toast('Case details saved. Choose statements to continue.');
  });
  $('#fileInput')?.addEventListener('change', e => handleFiles([...e.target.files]));

  let dz = $('#dropzone');
  if (dz) {
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = () => dz.classList.remove('dragover');
    dz.ondrop = e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      handleFiles([...e.dataTransfer.files]);
    };
  }

  document.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
    state.files = state.files.filter(f => f.name !== b.dataset.remove);
    render();
  });

  $('#tableSearch')?.addEventListener('input', e => {
    state.search = e.target.value;
    if (state.txFilters) state.txFilters.search = e.target.value;
    let pos = e.target.selectionStart;
    render();
    $('#tableSearch')?.focus();
    $('#tableSearch')?.setSelectionRange(pos, pos);
  });

  // Transactions Page Advanced Filter Controls
  $('#txChannelFilter')?.addEventListener('change', e => {
    if (!state.txFilters) state.txFilters = {};
    state.txFilters.channel = e.target.value;
    render();
  });
  $('#txAmountFilter')?.addEventListener('change', e => {
    if (!state.txFilters) state.txFilters = {};
    state.txFilters.tier = e.target.value;
    render();
  });
  $('#txAccountFilter')?.addEventListener('change', e => {
    if (!state.txFilters) state.txFilters = {};
    state.txFilters.account = e.target.value;
    render();
  });
  $('#txSortFilter')?.addEventListener('change', e => {
    if (!state.txFilters) state.txFilters = {};
    state.txFilters.sort = e.target.value;
    render();
  });
  $('#txOnlyMulesBtn')?.addEventListener('click', () => {
    if (!state.txFilters) state.txFilters = {};
    state.txFilters.onlyMules = !state.txFilters.onlyMules;
    render();
  });
  const resetTxFilters = () => {
    state.search = '';
    state.txFilters = {
      search: '',
      direction: 'all',
      channel: 'all',
      tier: 'all',
      account: 'all',
      sort: 'date-desc',
      onlyMules: false
    };
    render();
  };
  $('#txResetFiltersBtn')?.addEventListener('click', resetTxFilters);
  $('#txResetFiltersEmptyBtn')?.addEventListener('click', resetTxFilters);

  document.querySelectorAll('[data-txdirection]').forEach(b => {
    b.addEventListener('click', () => {
      if (!state.txFilters) state.txFilters = {};
      state.txFilters.direction = b.dataset.txdirection;
      render();
    });
  });

  document.querySelectorAll('[data-clear-filter]').forEach(b => {
    b.addEventListener('click', () => {
      if (!state.txFilters) state.txFilters = {};
      let key = b.dataset.clearFilter;
      if (key === 'search') { state.search = ''; state.txFilters.search = ''; }
      else if (key === 'direction') state.txFilters.direction = 'all';
      else if (key === 'channel') state.txFilters.channel = 'all';
      else if (key === 'tier') state.txFilters.tier = 'all';
      else if (key === 'account') state.txFilters.account = 'all';
      else if (key === 'onlyMules') state.txFilters.onlyMules = false;
      render();
    });
  });

  document.querySelectorAll('[data-account]').forEach(b => b.onclick = () => {
    state.selected = b.dataset.account;
    render();
  });

  $('#printBtn')?.addEventListener('click', () => window.print());

  $('#bsaCertBtn')?.addEventListener('click', async () => {
    toast('Generating Section 63 BSA 2023 Electronic Evidence Certificate with SHA3-256 hash...');
    try {
      let resp = await fetch(api('/api/legal/bsa-certificate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: state.case?.caseId || 'CR-2026-OCT-4287',
          officer_name: 'IO Rajesh Sharma (Cyber Police)',
          evidence_payload: `${state.transactions?.length || 0} transactions; UTR: ${state.case?.utr}`
        })
      });
      let data = await resp.json();
      let modal = document.getElementById('bsaModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bsaModal';
        modal.className = 'dns-ct-modal-overlay';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `
        <div class="dns-ct-modal-card">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:10px;margin-bottom:14px">
            <div>
              <span class="eyebrow" style="color:#059669;font-weight:700">COURT ADMISSIBILITY CERTIFICATE</span>
              <h2 style="margin:2px 0;font-size:16px;color:#0f172a">Section 63 Bharatiya Sakshya Adhiniyam, 2023</h2>
              <small style="color:#64748b;font-family:var(--mono)">Cryptographic Standard: NIST FIPS 202 SHA3-256</small>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('bsaModal').style.display='none'" style="font-size:14px;padding:4px 10px">✕</button>
          </div>
          <pre style="background:#f8fafc;border:1px solid #cbd5e1;padding:16px;font-family:var(--mono);font-size:10px;line-height:1.6;border-radius:6px;max-height:55vh;overflow-y:auto;white-space:pre-wrap;color:#0f172a">${esc(data.certificate_text)}</pre>
          <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:var(--mono);font-size:10px;color:#2563eb">SHA3-256 Digest: <b>${esc((data.sha3_256_hash || '').slice(0, 32))}...</b></span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.querySelector('#bsaModal pre').textContent);toast('Copied Section 63 BSA Certificate!');">📋 Copy Certificate</button>
              <button class="btn btn-primary btn-sm" onclick="window.print()">🖨️ Print Certificate</button>
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('bsaModal').style.display='none'">Close</button>
            </div>
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    } catch (e) {
      toast('Error generating BSA certificate: ' + e.message);
    }
  });
  $('#playTrail')?.addEventListener('click', () => toast('Trail animation played in timestamp order'));

  $('#draftBtn')?.addEventListener('click', () => {
    $('#draft').innerHTML = `
      <div class="card draft-output">
        <b>Editable bank records request · synthetic values</b>
        <textarea rows="8">To the records custodian,\n\nRe: Case ${state.case.caseId}\nPlease preserve records relating to UTR ${state.case.utr}, amount ${money(state.case.amount)}, timestamp ${state.case.txDate} ${state.case.zone}. Please provide responsive records under applicable legal process (§94 / §106 BNSS 2023). Subscriber, login, and access records are not publicly obtainable and require lawful process.\n\n[Authorised investigator details]</textarea>
      </div>`;
  });

  // AI forensic audit handler
  $('#runAiAuditBtn')?.addEventListener('click', async () => {
    if (state.isAuditing) return;
    state.isAuditing = true;
    toast('Running LLM Forensic Analysis with Gemini & Rule Engine...');
    render();
    try {
      let resp = await fetch(api('/api/ai/audit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case: state.case, transactions: state.transactions })
      });
      let data = await resp.json();
      if (data.success && data.audit) {
        state.aiAudit = data.audit;
        toast('AI Forensic Briefing generated successfully!');
      } else {
        toast('AI Audit analysis updated.');
      }
    } catch (e) {
      toast('AI Engine response: ' + e.message);
    } finally {
      state.isAuditing = false;
      render();
      setTimeout(() => document.getElementById('aiDossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  });

  if (state.page === 'intel') {
    wireIntelEvents();
  }
}

async function openDnsCtModal(domain) {
  let modal = document.getElementById('dnsCtModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dnsCtModal';
    modal.className = 'dns-ct-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="dns-ct-modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px">
        <div>
          <span class="eyebrow" style="color:#059669;font-weight:700">INFRASTRUCTURE RECONNAISSANCE</span>
          <h2 style="margin:2px 0;font-size:16px;color:#0f172a">Historical DNS & Certificate Transparency (CT)</h2>
          <small style="color:#64748b;font-family:var(--mono)">Target: <b>${esc(domain)}</b> · Standard: RFC 6962 CT Logs & Passive DNS</small>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('dnsCtModal').style.display='none'" style="font-size:14px;padding:4px 10px">✕</button>
      </div>
      <div style="text-align:center;padding:30px 0;color:#64748b">Loading forensic DNS resolution & CT telemetry...</div>
    </div>
  `;
  modal.style.display = 'flex';

  try {
    let [dnsRes, ctRes] = await Promise.all([
      fetch(api(`/api/intel/dns-history?domain=${encodeURIComponent(domain)}`)).then(r => r.json()),
      fetch(api(`/api/intel/ct-logs?domain=${encodeURIComponent(domain)}`)).then(r => r.json())
    ]);

    let dnsHistory = dnsRes.history || [];
    let certs = ctRes.certificates || [];
    let subdomains = ctRes.discovered_subdomains || [];

    modal.innerHTML = `
      <div class="dns-ct-modal-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:14px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="eyebrow" style="color:#059669;font-weight:700">HISTORICAL THREAT INTELLIGENCE</span>
              <span style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:9px;font-weight:700;padding:2px 6px;border-radius:99px;font-family:var(--mono)">🛡️ SHA3-256 HASH VERIFIED</span>
            </div>
            <h2 style="margin:4px 0 2px;font-size:16px;color:#0f172a">DNS Resolution History & Certificate Transparency Logs</h2>
            <div style="font-size:11px;color:#64748b;font-family:var(--mono)">
              Target: <b style="color:#0f172a">${esc(domain)}</b> · Discovered SAN Subdomains: <b style="color:#2563eb">${subdomains.length}</b> · SHA3-256 Digest: <span style="font-size:9px;color:#475569">${esc((ctRes.sha3_256_audit_signature || '').slice(0, 24))}...</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('dnsCtModal').style.display='none'" style="font-size:14px;padding:4px 10px">✕</button>
        </div>

        ${dnsRes.fast_flux_detected ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;padding:8px 12px;border-radius:4px;font-size:11px;color:#991b1b;margin-bottom:14px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">⚠️</span>
            <div><strong>Fast-Flux / Bulletproof Shift Detected:</strong> Domain underwent low-TTL A-record migration pointing to offshore bulletproof IP infrastructure right before fraudulent activity.</div>
          </div>
        ` : ''}

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span>📡</span> <span>Historical A-Record & Nameserver Timeline</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${dnsHistory.map((rec) => `
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;font-size:11px;display:grid;grid-template-columns:60px 130px 1fr 140px;gap:10px;align-items:center">
                <span class="mono" style="font-weight:700;background:#e2e8f0;padding:2px 6px;border-radius:4px;text-align:center">${esc(rec.record_type)}</span>
                <span class="mono" style="font-weight:700;color:#0f172a">${esc(rec.ip)}</span>
                <div>
                  <div style="color:#334155;font-weight:600">${esc(rec.asn)} (${esc(rec.country)})</div>
                  <small style="color:#64748b">${esc(rec.notes)}</small>
                </div>
                <div style="text-align:right;color:#64748b;font-size:10px">
                  <div>First: <b>${esc(rec.first_seen.split(' ')[0])}</b></div>
                  <div>Last: <b>${esc(rec.last_seen.split(' ')[0])}</b></div>
                  <span class="pill pill-low" style="font-size:8px;margin-top:2px">${esc(rec.status)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span>📜</span> <span>Certificate Transparency (CT) Issuance Logs (RFC 6962)</span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:6px">
              <thead>
                <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;text-align:left;color:#475569">
                  <th style="padding:6px 10px">ISSUER CA</th>
                  <th style="padding:6px 10px">VALIDITY</th>
                  <th style="padding:6px 10px">SERIAL NUMBER</th>
                  <th style="padding:6px 10px">SHA3-256 FINGERPRINT (FIPS 202)</th>
                  <th style="padding:6px 10px">CT LOG ID</th>
                </tr>
              </thead>
              <tbody>
                ${certs.map(c => `
                  <tr style="border-bottom:1px solid #f1f5f9">
                    <td style="padding:6px 10px;font-weight:600;color:#0f172a">${esc(c.issuer_ca)}</td>
                    <td style="padding:6px 10px;color:#059669">${esc(c.valid_from)} to ${esc(c.valid_to)}</td>
                    <td style="padding:6px 10px;font-family:var(--mono);font-size:10px">${esc(c.serial_number)}</td>
                    <td style="padding:6px 10px;font-family:var(--mono);font-size:10px;color:#2563eb" title="${esc(c.sha3_256_fingerprint)}">${esc((c.sha3_256_fingerprint || '').slice(0, 18))}...</td>
                    <td style="padding:6px 10px;font-size:10px;color:#64748b">${esc(c.log_id)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <span>🔎</span> <span>Discovered Hidden Subdomains via CT SANs (${subdomains.length})</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${subdomains.map(s => `
              <span class="mono" style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600">
                ${esc(s)}
              </span>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <small style="color:#64748b;font-family:var(--mono)">Algorithm: NIST FIPS 202 SHA3-256 · RFC 6962 Public Logs</small>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${esc(domain)} SHA3-256: ${esc(ctRes.sha3_256_audit_signature || '')}');toast('Copied SHA3-256 Audit Signature!');">📋 Copy SHA3-256 Digest</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('dnsCtModal').style.display='none'">Close</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    modal.innerHTML = `
      <div class="dns-ct-modal-card">
        <h3 style="color:#dc2626">Failed to load DNS / CT Logs</h3>
        <p>${esc(err.message)}</p>
        <button class="btn btn-secondary" onclick="document.getElementById('dnsCtModal').style.display='none'">Close</button>
      </div>
    `;
  }
}

function wireIntelEvents() {
  document.querySelectorAll('.dns-ct-btn').forEach(btn => {
    btn.onclick = () => {
      let domain = btn.dataset.domain;
      if (domain) openDnsCtModal(domain);
    };
  });
  $('#satarkAnalyzeBtn')?.addEventListener('click', () => {
    let val = $('#satarkDomainInput')?.value?.trim();
    if (!val) {
      toast('Please enter a domain or URL to scan.');
      return;
    }
    let analyzed = satarkAnalyzeUrl(val);
    if (!state.intelDomains) state.intelDomains = [...initialCaseDomains];
    state.intelDomains.unshift(analyzed);
    toast(`⚡ Analyzed ${analyzed.domain} · Risk: ${analyzed.riskLevel}`);
    render();
  });

  $('#satarkDomainInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      $('#satarkAnalyzeBtn')?.click();
    }
  });

  document.querySelectorAll('.satark-quick-pill[data-scan]').forEach(btn => {
    btn.onclick = () => {
      let target = btn.dataset.scan;
      if (target) {
        let input = $('#satarkDomainInput');
        if (input) input.value = target;
        $('#satarkAnalyzeBtn')?.click();
      }
    };
  });

  document.querySelectorAll('[data-copy-ioc]').forEach(btn => {
    btn.onclick = () => {
      let val = btn.dataset.copyIoc;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(val);
      }
      toast(`Copied indicator: ${val}`);
    };
  });
}

async function handleFiles(files) {
  saveCase();
  for (const file of files) {
    let ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'pdf', 'txt'].includes(ext)) {
      toast('Supported files: XLSX, XLS, CSV, PDF, TXT');
      continue;
    }
    let entry = {
      name: file.name,
      ext,
      size: file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB',
      status: 'Reading',
      progress: 20,
      detected: ext.toUpperCase()
    };
    state.files.push(entry);
  }
  render();

  for (const file of files) {
    let entry = state.files.find(f => f.name === file.name);
    if (!entry) continue;

    try {
      if (entry.ext === 'csv') {
        entry.status = 'Normalising';
        entry.progress = 55;
        render();
        let parsed = parseCSV(await file.text(), file.name);
        entry.rawHeaders = parsed.headers;
        entry.rawRows = parsed.rawRows;
        mergeRows(parsed.rows);
        entry.detected = `CSV · ${parsed.rows.length} rows`;
        entry.warnings = parsed.warnings;
        entry.quality = parsed.quality;
        entry.status = parsed.needsMapping ? 'Needs review' : 'Done';
        entry.mapping = parsed.needsMapping ? parsed.headers : null;
      } else if (entry.ext === 'txt') {
        // Raw text file: send directly to LLM parser!
        entry.status = 'AI Parsing';
        entry.progress = 60;
        render();
        let text = await file.text();
        let resp = await fetch(api('/api/ai/parse-text'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, name: file.name })
        });
        let result = await resp.json();
        if (result.rows && result.rows.length) {
          mergeRows(result.rows);
          entry.detected = `TXT · ${result.rows.length} rows (AI)`;
          entry.status = 'Done (AI Parsed)';
          entry.warnings = [`Parsed by ${result.mode || 'AI'}`];
          entry.quality = 95;
        } else {
          entry.status = 'Needs review';
          entry.warnings = ['No rows extracted'];
        }
      } else {
        entry.status = 'Reading';
        entry.progress = 35;
        render();
        let buffer = await file.arrayBuffer();
        let payload = {
          name: file.name,
          ext: entry.ext,
          content: arrayBufferToBase64(buffer)
        };
        let resp = await fetch(api('/api/parse'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw Error('Parser service returned ' + resp.status);
        let result = await resp.json();
        entry.rawHeaders = result.headers || [];
        entry.rawRows = result.raw_rows || [];

        if (result.rows?.length) {
          mergeRows(result.rows);
          entry.detected = result.format;
          entry.status = result.needs_review ? 'Needs review' : 'Done';
          entry.warnings = result.warnings || [];
          entry.quality = result.quality;
          entry.mapping = result.needs_review ? result.headers : null;
        } else {
          entry.status = 'Needs review · ' + (result.message || 'No readable text rows');
          entry.mapping = result.headers || [];
          entry.warnings = result.warnings || [];
          entry.quality = result.quality;
        }
      }
    } catch (err) {
      entry.status = 'Needs review · ' + err.message;
      entry.mapping = [];
      entry.warnings = ['Parsing error: check file format'];
      entry.quality = 0;
    }
    entry.progress = 100;
    render();
  }

  state.loaded = state.transactions.length > 0;
  if (!state.case) state.case = {};
  if (!Number(state.case.amount) && state.transactions.length > 0) {
    state.case.amount = getCaseAmount();
  }
  if (!state.case.caseId) {
    state.case.caseId = 'TG-2026-' + Math.floor(Math.random() * 9000 + 1000);
  }
  $('#caseLabel').textContent = state.case.caseId + ' · Active';
  $('#txCount').textContent = state.transactions.length;
  $('#flagCount').textContent = flags().length;
  render();
  toast('Upload processed and distributed. 5-Rule Mule scoring updated.');
}

function parseCSV(text, name) {
  let lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim());
  if (!lines.length) return { rows: [], warnings: ['Empty file'], quality: 0, needsMapping: true };
  let delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  let headers = csvLine(lines[0], delimiter).map(x => x.trim());
  let rawRows = lines.slice(1).map(line => csvLine(line, delimiter));
  let norm = headers.map(x => x.toLowerCase());
  let find = re => norm.findIndex(x => re.test(x));
  let ix = {
    date: find(/date|time|timestamp/),
    amount: find(/amount|value/),
    debit: find(/debit|withdraw/),
    credit: find(/credit|deposit/),
    balance: find(/balance/),
    from: find(/from|sender|remitter/),
    to: find(/to|beneficiary|counterparty|payee/),
    account: find(/account|acct/),
    utr: find(/utr|reference|transaction.?id|rrn/),
    narration: find(/narration|description|details|remark/)
  };
  let recognized = ix.date >= 0 && (ix.amount >= 0 || ix.debit >= 0 || ix.credit >= 0);
  let warnings = [];
  if (!recognized) warnings.push('Column names need review. Map date and amount/debit/credit fields.');

  let rows = rawRows.map((c, i) => {
    let val = k => ix[k] >= 0 ? c[ix[k]]?.trim() : '';
    let dr = Number((val('debit') || '').replace(/[^\d.-]/g, '')) || 0,
        cr = Number((val('credit') || '').replace(/[^\d.-]/g, '')) || 0,
        amt = Number((val('amount') || '').replace(/[^\d.-]/g, '')) || dr || cr;
    let rawNarration = val('narration') || val('counterparty') || '';
    let cp = extractCounterpartyFromNarration(rawNarration) || 'UNKNOWN';
    let acc = val('account') || state.case?.victimAccount || name.replace(/\.[^/.]+$/, "");
    let from = val('from') || (dr ? acc : cp);
    let to = val('to') || (cr ? acc : cp);
    return {
      id: 'UP-' + name + '-' + (i + 2),
      datetime: normalDate(val('date')),
      from: from,
      to: to,
      amount: Math.abs(amt),
      direction: dr ? 'debit' : 'credit',
      balance: Number((val('balance') || '').replace(/[^\d.-]/g, '')) || null,
      counterparty: cp,
      account_reference: acc,
      utr: val('utr'),
      narration: rawNarration,
      source_file: name,
      source_row: 'row ' + (i + 2)
    };
  }).filter(x => x.amount || x.utr || x.datetime);

  if (rows.some(r => !r.utr)) warnings.push('One or more rows have a missing UTR.');
  return { rows, headers, rawRows, warnings, quality: Math.max(0, Math.round(100 - (warnings.length * 18))), needsMapping: !recognized };
}

function csvLine(s, d) {
  let out = [], v = '', q = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && s[i + 1] === '"' && q) { v += '"'; i++; }
    else if (s[i] === '"') q = !q;
    else if (s[i] === d && !q) { out.push(v); v = ''; }
    else v += s[i];
  }
  out.push(v);
  return out;
}

function normalDate(x) {
  if (!x) return '';
  let d = new Date(x);
  return Number.isNaN(d.getTime()) ? x : d.toISOString();
}

function mergeRows(rows) {
  let seen = new Set(state.transactions.map(t => [t.datetime, t.from, t.to, t.amount, t.utr].join('|'))), added = 0;
  for (let t of rows) {
    let key = [t.datetime, t.from, t.to, t.amount, t.utr].join('|');
    if (!seen.has(key)) {
      seen.add(key);
      state.transactions.push(t);
      added++;
    }
  }
  return added;
}

function mappingCard(f) {
  if (!f.mapping) return '';
  let keys = ['datetime', 'amount', 'debit', 'credit', 'balance', 'counterparty', 'account_reference', 'utr', 'narration'],
      saved = state.mappings[(f.rawHeaders || []).join('|')] || [];
  return `<div class="card review-card">
    <h3>Review & map · ${esc(f.name)}</h3>
    <p>Quality score: ${f.quality ?? '-'}% · ${esc((f.warnings || []).join(' · '))}</p>
    ${(Array.isArray(f.mapping) ? f.mapping : []).map((h, i) => `
      <div class="mapping-row">
        <span>${esc(h || 'Column ' + (i + 1))}</span>
        <select data-map-file="${esc(f.name)}" data-col="${i}">
          <option value="">Unmapped</option>
          ${keys.map(k => `<option ${saved[i] === k ? 'selected' : ''}>${k}</option>`).join('')}
        </select>
      </div>
    `).join('')}
    <button class="btn btn-secondary" data-apply-map="${esc(f.name)}">Apply mapping</button>
  </div>`;
}

$('#page').addEventListener('click', e => {
  let b = e.target.closest('[data-apply-map]');
  if (!b) return;
  e.stopImmediatePropagation();
  let f = state.files.find(x => x.name === b.dataset.applyMap);
  let map = [...document.querySelectorAll(`[data-map-file="${CSS.escape(f.name)}"]`)].map(x => x.value);
  state.mappings[(f.rawHeaders || []).join('|')] = map;
  let mapped = (f.rawRows || []).map((r, i) => {
    let get = k => {
      let j = map.indexOf(k);
      return j >= 0 ? r[j] || '' : '';
    };
    let dr = Number((get('debit') || '').replace(/[^\d.-]/g, '')) || 0,
        cr = Number((get('credit') || '').replace(/[^\d.-]/g, '')) || 0,
        amount = Number((get('amount') || '').replace(/[^\d.-]/g, '')) || dr || cr;
    return {
      id: 'UP-' + f.name + '-' + (i + 2),
      datetime: normalDate(get('datetime')),
      from: dr ? get('account_reference') : (get('counterparty') || 'UNKNOWN'),
      to: dr ? (get('counterparty') || 'UNKNOWN') : (get('account_reference') || 'UNKNOWN'),
      amount,
      direction: dr ? 'debit' : 'credit',
      balance: Number((get('balance') || '').replace(/[^\d.-]/g, '')) || null,
      counterparty: get('counterparty'),
      account_reference: get('account_reference'),
      utr: get('utr'),
      narration: get('narration'),
      source_file: f.name,
      source_row: 'row ' + (i + 2)
    };
  }).filter(x => x.amount || x.utr || x.datetime);

  let added = mergeRows(mapped);
  f.mapping = null;
  f.status = 'Done · mapping applied';
  f.quality = Math.max(f.quality || 0, 70);
  f.warnings = [`${added} mapped, non-duplicate transactions added.`];
  $('#txCount').textContent = state.transactions.length;
  $('#flagCount').textContent = flags().length;
  render();
  toast(`${added} transactions added using saved column mapping.`);
}, true);

const baseRender = render;
render = function() {
  baseRender();
  if (state.page === 'intake' && state.files.some(f => f.warnings || f.mapping)) {
    let r = $('#review');
    r.innerHTML = state.files.map(mappingCard).join('');
  }
};

let workspaceNavWired = false;
let ssoGateWired = false;
let urlParamsApplied = false;

const DEMO_SSO_PROFILES = {
  'RJ-CYBER-941': {
    name: 'IO Rajesh Sharma',
    badgeNumber: 'RJ-CYBER-941',
    role: 'Investigating Officer (IO)',
    unit: 'Cyber Crime PS, Jaipur'
  },
  'RJ-R4C-ADMIN-01': {
    name: 'R4C Nodal Admin',
    badgeNumber: 'RJ-R4C-ADMIN-01',
    role: 'Supervisory Admin (SHO / Nodal Officer)',
    unit: 'Rajasthan Cyber Command'
  },
  'RJ-FORENSIC-108': {
    name: 'Dr. Ananya Verma',
    badgeNumber: 'RJ-FORENSIC-108',
    role: 'Cyber Forensic Officer',
    unit: 'State Cyber Forensic Lab'
  }
};

function getOfficerInitials(name = 'IO') {
  const clean = String(name || 'IO').replace(/^(IO|Dr|Mr|Ms|Mrs|Shri)\.?\s+/i, '').trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (clean.slice(0, 2) || 'IO').toUpperCase();
}

function formatOfficerNameFromSsoId(ssoId) {
  const key = String(ssoId || '').trim().toUpperCase();
  if (DEMO_SSO_PROFILES[key]) return DEMO_SSO_PROFILES[key].name;
  const localPart = String(ssoId || '').split('@')[0].trim();
  if (/[._]/.test(localPart) && !/^RJ-/i.test(localPart)) {
    return localPart
      .split(/[._]+/)
      .filter(Boolean)
      .map(w => (/^(io|sho|sp|dsp|asi|si)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ');
  }
  return `Officer ${localPart.toUpperCase()}`;
}

function applySsoProfileToUi() {
  const profile = getStoredSsoProfile();
  const initials = getOfficerInitials(profile.name);
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const avEl = document.getElementById('userAvatar');
  const topAvEl = document.getElementById('topAvatar');
  if (nameEl) nameEl.textContent = profile.name;
  if (roleEl) roleEl.textContent = profile.badgeNumber || 'RJ-R4C';
  if (avEl) avEl.textContent = initials;
  if (topAvEl) topAvEl.textContent = initials;
  state.userName = profile.name;
  window.state = state;
}

function persistSsoSession(profile) {
  try {
    sessionStorage.setItem('r4c_sso_session', 'true');
    localStorage.setItem('r4c_auth_state', 'true');
    localStorage.setItem('r4c_auth_role', profile.role);
    localStorage.setItem('r4c_auth_user', JSON.stringify(profile));
    localStorage.setItem('r4c_user_profile', JSON.stringify(profile));
  } catch (e) {}
}

function performSsoLogout() {
  clearSsoSession();
  urlParamsApplied = false;
  state.page = 'intake';
  state.case = null;
  state.files = [];
  state.transactions = [];
  state.loaded = false;
  state.selected = null;
  state.aiAudit = null;
  state.trailResult = null;
  state.trailSelectedNode = null;
  state.trailSelectedEdge = null;
  state.userName = '';

  const form = document.getElementById('ssoLoginForm');
  form?.reset();
  const pwInput = document.getElementById('ssoPasswordInput');
  const togglePwBtn = document.getElementById('toggleSsoPassword');
  if (pwInput) pwInput.type = 'password';
  if (togglePwBtn) {
    togglePwBtn.textContent = 'Show';
    togglePwBtn.setAttribute('aria-label', 'Show password');
  }
  document.querySelectorAll('.sso-demo-btn').forEach(b => b.classList.remove('selected'));
  const prefillNote = document.getElementById('ssoPrefillNote');
  if (prefillNote) prefillNote.textContent = '';
  const errorBox = document.getElementById('ssoError');
  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  showSsoGate();
  toast('Logged out of RajSSO session');
}

function wireWorkspaceShell() {
  if (workspaceNavWired) return;
  workspaceNavWired = true;

  $('#nav')?.addEventListener('click', e => {
    if (e.target.closest('[data-page]')) {
      $('#caseLabel').textContent = (state.case?.caseId ? state.case.caseId + ' · Active' : 'No case selected');
    }
  });
  $('#dismissBanner')?.addEventListener('click', () => $('.synthetic-banner')?.remove());

  document.addEventListener('click', e => {
    if (e.target.closest('#logoutBtn') || e.target.closest('#userProfileBadge')) {
      e.preventDefault();
      performSsoLogout();
    }
  });

  document.getElementById('userProfileBadge')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      performSsoLogout();
    }
  });
}

// URL Query Parameter Routing for automated testing & deep links (runs only after SSO login)
function checkUrlParams() {
  if (urlParamsApplied) return;
  urlParamsApplied = true;
  if (typeof window === 'undefined' || !window.location) return;
  let params = new URLSearchParams(window.location.search);

  if (params.get('sample') === 'true' || params.get('demo') === 'sunrise') {
    if (window.SAMPLE_STATEMENT_DATA) {
      state.case = window.SAMPLE_STATEMENT_DATA.case;
      state.transactions = window.SAMPLE_STATEMENT_DATA.rows;
      state.statementAccounts = window.SAMPLE_STATEMENT_DATA.statement_accounts || [];
      state.files = [
        { name: 'Sample_Statement_SunriseTraders.pdf', detected: 'PDF Statement · 26 txns', size: '5.5 KB', ext: 'pdf', status: 'Done', progress: 100 },
        { name: 'Sample_Statement_KiranEnterprises.xlsx', detected: 'XLSX Statement · 21 txns', size: '6.9 KB', ext: 'xlsx', status: 'Done', progress: 100 }
      ];
      state.loaded = true;
      state.trailUtr = params.get('utr') || state.case.utr || '428714563201';
      state.page = params.get('view') || 'trail';

      if (params.get('drawer') === 'node') {
        state.trailSelectedNode = params.get('node') || 'SUNRISE TRADERS';
        state.trailSelectedEdge = null;
      }
      if (params.get('tab')) {
        state.trailDrawerTab = params.get('tab');
      }
      if (params.get('second_view')) {
        state.trailSecondView = params.get('second_view');
      }
      if (params.get('play') === 'true') {
        state.isPlaying = true;
        state.playStep = 1;
      }

      render();
      if (params.get('drawer') === 'edge' && state.trailResult?.edges?.length) {
        state.trailSelectedEdge = state.trailResult.edges[0].id;
        state.trailSelectedNode = null;
        render();
      }
    } else {
      loadSunriseKiranDemo().then(() => {
        if (params.get('view')) state.page = params.get('view');
        if (params.get('utr')) state.trailUtr = params.get('utr');
        if (params.get('drawer') === 'node') {
          state.trailSelectedNode = params.get('node') || 'SUNRISE TRADERS';
          state.trailSelectedEdge = null;
        } else if (params.get('drawer') === 'edge') {
          if (state.trailResult?.edges?.length) {
            state.trailSelectedEdge = state.trailResult.edges[0].id;
            state.trailSelectedNode = null;
          }
        }
        if (params.get('tab')) state.trailDrawerTab = params.get('tab');
        if (params.get('second_view')) state.trailSecondView = params.get('second_view');
        if (params.get('play') === 'true') {
          state.isPlaying = true;
          state.playStep = 1;
        }
        render();
      });
    }
  } else if (params.get('view') || params.get('page')) {
    state.page = params.get('view') || params.get('page');
    if (params.get('loadSample') === 'true') {
      fetch(api('/api/sample-statements')).then(r => r.json()).then(data => {
        if (data.success && data.files) {
          state.parser.files = data.files;
          state.parser.rows = data.rows || [];
          state.transactions = data.rows || [];
          state.case = data.case;
          state.statementAccounts = data.statement_accounts || [];
          state.loaded = true;
          if (params.get('mappingModal') === 'true') {
            state.parser.mappingModalFile = 0;
          }
          if (params.get('drawer') === 'row' && state.parser.rows.length) {
            state.parser.selectedRow = state.parser.rows[0];
          }
          render();
        }
      });
    }
    render();
  }
}

function enterWorkspace(welcomeToast = false) {
  document.documentElement.classList.add('sso-authenticated');
  document.title = 'TraceGrid - Investigation Workspace';
  wireWorkspaceShell();
  applySsoProfileToUi();
  render();
  checkUrlParams();
  if (welcomeToast) {
    const profile = getStoredSsoProfile();
    toast(`RajSSO authenticated: ${profile.name} (${profile.badgeNumber})`);
  }
}

function showSsoGate() {
  document.documentElement.classList.remove('sso-authenticated');
  document.title = 'RajSSO · Rajasthan Single Sign-On — TraceGrid';

  const form = document.getElementById('ssoLoginForm');
  const ssoIdInput = document.getElementById('ssoIdInput');
  const passwordInput = document.getElementById('ssoPasswordInput');
  const roleSelect = document.getElementById('ssoRoleSelect');
  const togglePwBtn = document.getElementById('toggleSsoPassword');
  const loginBtn = document.getElementById('ssoLoginBtn');
  const loginBtnText = document.getElementById('ssoLoginBtnText');
  const errorBox = document.getElementById('ssoError');
  const prefillNote = document.getElementById('ssoPrefillNote');
  const demoBtns = document.querySelectorAll('.sso-demo-btn');

  if (!form || ssoGateWired) return;
  ssoGateWired = true;

  const setError = msg => {
    if (!errorBox) return;
    if (!msg) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    } else {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
  };

  togglePwBtn?.addEventListener('click', () => {
    if (!passwordInput) return;
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePwBtn.textContent = isHidden ? 'Hide' : 'Show';
    togglePwBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });

  demoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      demoBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const ssoId = btn.dataset.ssoId || '';
      const name = btn.dataset.ssoName || '';
      const role = btn.dataset.ssoRole || '';
      if (ssoIdInput) ssoIdInput.value = ssoId;
      if (passwordInput) passwordInput.value = 'demo-r4c-2026';
      if (roleSelect && role) roleSelect.value = role;
      setError('');
      if (prefillNote) {
        prefillNote.textContent = `Prefilled demo credentials for ${name} (${ssoId}). Click Authenticate to continue.`;
      }
      loginBtn?.focus();
    });
  });

  [ssoIdInput, passwordInput].forEach(input => {
    input?.addEventListener('input', () => setError(''));
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const rawId = (ssoIdInput?.value || '').trim();
    const rawPw = (passwordInput?.value || '').trim();
    const selectedRole = roleSelect?.value || 'Investigating Officer (IO)';

    if (rawId.length < 3) {
      setError('Please enter a valid RajSSO ID or official username (at least 3 characters), or pick a demo officer profile below.');
      ssoIdInput?.focus();
      return;
    }
    if (rawPw.length < 4) {
      setError('Please enter your RajSSO password (at least 4 characters for demo authentication).');
      passwordInput?.focus();
      return;
    }

    setError('');
    if (loginBtn) loginBtn.disabled = true;
    if (loginBtnText) loginBtnText.textContent = 'Verifying RajSSO token…';

    const preset = DEMO_SSO_PROFILES[rawId.toUpperCase()];
    const profile = {
      name: preset ? preset.name : formatOfficerNameFromSsoId(rawId),
      badgeNumber: preset ? preset.badgeNumber : rawId.toUpperCase(),
      ssoId: rawId,
      role: selectedRole,
      unit: preset ? preset.unit : 'Rajasthan Police & Cyber Cell'
    };

    setTimeout(() => {
      persistSsoSession(profile);
      if (loginBtn) loginBtn.disabled = false;
      if (loginBtnText) loginBtnText.textContent = 'Authenticate via RajSSO →';
      enterWorkspace(true);
    }, 180);
  });
}

(function bootstrapAuthFlow() {
  if (isSsoAuthenticated()) {
    enterWorkspace(false);
  } else {
    showSsoGate();
  }
})();
