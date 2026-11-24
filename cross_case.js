/**
 * TraceGrid - Cross-Case Forensic Intelligence & Syndicate Radar Module
 *
 * Implements:
 * - Multi-case linkage of accounts, UPI handles, IFSCs, phones, and infrastructure (IPs/domains)
 * - Pairwise Case Overlap Matrix (Scam A vs Scam B side-by-side evidence)
 * - Interactive SVG Bipartite Syndicate Graph
 * - Syndicate Radar Dossier with statutory escalation under Section 94 & 106 BNSS 2023
 * - Cross-case visual warning badges across Money Trail, Mule Detector, and Intel pages
 */

(function () {
  'use strict';

  // --- 1. PRE-SEEDED OFFLINE MULTI-CASE DATA STORE (FALLBACK & ZERO-LATENCY CACHE) ---
  const PRESEEDED_CASES = [
    {
      case_id: 'CR-2026-OCT-4287',
      title: 'Sunrise Investment Syndicate',
      modus_operandi: 'High-Yield Algorithmic Crypto & Forex Trading Phishing Scam',
      victim_name: 'Meera Nair',
      victim_account: 'ACC-VIC-4287',
      loss_amount: 485000.0,
      complaint_date: '2026-10-14T10:42:15',
      police_station: 'Cyber Crime Police Station, Jaipur City',
      primary_account: 'SUNRISE TRADERS (50100234567801)',
      primary_ip: '198.51.100.24',
      primary_upi: 'ravi@xupi',
      accounts: [
        { account_no: '50100234567801', holder_name: 'SUNRISE TRADERS', bank: 'HDFC Bank', role: 'Hop 1 Primary Aggregator', amount: 485000.0 },
        { account_no: '60200987654302', holder_name: 'KIRAN ENTERPRISES', bank: 'ICICI Bank', role: 'Hop 2 Layering Mule', amount: 260000.0 },
        { account_no: 'XBNK0003344', holder_name: 'R K EXPORTS', bank: 'Axis Bank', role: 'Hop 2 Layering Mule', amount: 175000.0 }
      ],
      infrastructure: {
        ips: ['198.51.100.24'],
        domains: ['phish-sbi-portal.top', 'secure-payee-demo.test'],
        hosting: 'DigitalOcean VPS Netherlands'
      },
      phones: ['+91-9811223344']
    },
    {
      case_id: 'TG-2026-0841',
      title: 'Work-from-Home Telegram Task Scam',
      modus_operandi: 'Prepaid Task Rating, Video Liking & Crypto Escrow Commission Fraud',
      victim_name: 'Aarav Sample',
      victim_account: 'ACC-VIC-2041',
      loss_amount: 185000.0,
      complaint_date: '2026-08-14T11:30:00',
      police_station: 'State Cyber Crime Cell, Jaipur',
      primary_account: 'SUNRISE TRADERS (50100234567801)',
      primary_ip: '198.51.100.24',
      primary_upi: 'ravi@xupi',
      accounts: [
        { account_no: 'ACC-MA-1108', holder_name: 'MA TRADERS', bank: 'State Bank of India', role: 'Hop 1 Fan-In Collector Mule', amount: 185000.0 },
        { account_no: '50100234567801', holder_name: 'SUNRISE TRADERS', bank: 'HDFC Bank', role: 'Hop 2 Syndicate Consolidator (Cross-Case)', amount: 145000.0 }
      ],
      infrastructure: {
        ips: ['198.51.100.24'],
        domains: ['secure-payee-demo.test', 'verify-wallet-demo.test'],
        hosting: 'DigitalOcean VPS Netherlands'
      },
      phones: ['+91-9876543210']
    },
    {
      case_id: 'FIR-2026-NOV-9102',
      title: 'Fake Electricity Bill Phishing',
      modus_operandi: 'Urgent Disconnection Notice SMS with Malicious APK / Gateway Phishing',
      victim_name: 'Vikram Singh',
      victim_account: 'ACC-VIC-9102',
      loss_amount: 240000.0,
      complaint_date: '2026-11-02T16:15:30',
      police_station: 'Cyber Crime Police Station, Jodhpur Rural',
      primary_account: 'ACC-MA-1108',
      primary_ip: '198.51.100.24',
      primary_upi: 'vikram.power@ybl',
      accounts: [
        { account_no: 'ACC-MA-1108', holder_name: 'MA TRADERS', bank: 'State Bank of India', role: 'Hop 1 Rapid Drain Collector', amount: 240000.0 },
        { account_no: 'XBNK0003344', holder_name: 'R K EXPORTS', bank: 'Axis Bank', role: 'Hop 2 Layering Mule (Cross-Case)', amount: 180000.0 }
      ],
      infrastructure: {
        ips: ['198.51.100.24', '203.0.113.77'],
        domains: ['power-bill-update.online', 'parivahan-challan-pay.online'],
        hosting: 'Cloudflare Fronted / DigitalOcean Netherlands Origin'
      },
      phones: ['+91-9876543210']
    }
  ];

  // Pre-calculated Shared Entities across Cases
  const PRESEEDED_SHARED = [
    {
      entity_type: 'BANK_ACCOUNT',
      entity_value: '50100234567801',
      label: 'SUNRISE TRADERS (50100234567801)',
      bank: 'HDFC Bank',
      severity: 'CRITICAL',
      total_volume: 630000.0,
      cases: [
        { case_id: 'CR-2026-OCT-4287', title: 'Sunrise Investment Syndicate', role: 'Hop 1 Primary Aggregator', amount: 485000.0 },
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'Hop 2 Syndicate Consolidator', amount: 145000.0 }
      ]
    },
    {
      entity_type: 'IP_ADDRESS',
      entity_value: '198.51.100.24',
      label: '198.51.100.24 (DigitalOcean Netherlands)',
      severity: 'CRITICAL',
      total_volume: 0.0,
      cases: [
        { case_id: 'CR-2026-OCT-4287', title: 'Sunrise Investment Syndicate', role: 'C2 & Phishing Hosting' },
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'C2 & Phishing Hosting' },
        { case_id: 'FIR-2026-NOV-9102', title: 'Fake Electricity Bill Phishing', role: 'C2 & Phishing Hosting' }
      ]
    },
    {
      entity_type: 'UPI_HANDLE',
      entity_value: 'ravi@xupi',
      label: 'ravi@xupi (Shared Collection VPA)',
      severity: 'HIGH',
      total_volume: 0.0,
      cases: [
        { case_id: 'CR-2026-OCT-4287', title: 'Sunrise Investment Syndicate', role: 'Collection VPA' },
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'Collection VPA' }
      ]
    },
    {
      entity_type: 'BANK_ACCOUNT',
      entity_value: 'XBNK0003344',
      label: 'R K EXPORTS (XBNK0003344)',
      bank: 'Axis Bank',
      severity: 'HIGH',
      total_volume: 355000.0,
      cases: [
        { case_id: 'CR-2026-OCT-4287', title: 'Sunrise Investment Syndicate', role: 'Hop 2 Layering Mule', amount: 175000.0 },
        { case_id: 'FIR-2026-NOV-9102', title: 'Fake Electricity Bill Phishing', role: 'Hop 2 Layering Mule', amount: 180000.0 }
      ]
    },
    {
      entity_type: 'BANK_ACCOUNT',
      entity_value: 'ACC-MA-1108',
      label: 'MA TRADERS (ACC-MA-1108)',
      bank: 'State Bank of India',
      severity: 'HIGH',
      total_volume: 425000.0,
      cases: [
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'Hop 1 Fan-In Collector Mule', amount: 185000.0 },
        { case_id: 'FIR-2026-NOV-9102', title: 'Fake Electricity Bill Phishing', role: 'Hop 1 Rapid Drain Collector', amount: 240000.0 }
      ]
    },
    {
      entity_type: 'PHONE_NUMBER',
      entity_value: '+91-9876543210',
      label: '+91-9876543210 (Social Engineering / WhatsApp Lure)',
      severity: 'HIGH',
      total_volume: 0.0,
      cases: [
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'Lure Caller & Telegram Contact' },
        { case_id: 'FIR-2026-NOV-9102', title: 'Fake Electricity Bill Phishing', role: 'SMS Disconnection Threat Caller' }
      ]
    },
    {
      entity_type: 'DOMAIN',
      entity_value: 'secure-payee-demo.test',
      label: 'secure-payee-demo.test (Phishing Portal)',
      severity: 'HIGH',
      total_volume: 0.0,
      cases: [
        { case_id: 'CR-2026-OCT-4287', title: 'Sunrise Investment Syndicate', role: 'Ingress Phishing Portal' },
        { case_id: 'TG-2026-0841', title: 'Work-from-Home Telegram Task Scam', role: 'Ingress Phishing Portal' }
      ]
    }
  ];

  // Pre-calculated Syndicate Ring
  const PRESEEDED_SYNDICATES = [
    {
      syndicate_id: 'SYN-RING-APEX-01',
      name: 'Apex Inter-State Mewat-Jaipur Cyber Syndicate',
      cases_involved: ['CR-2026-OCT-4287', 'TG-2026-0841', 'FIR-2026-NOV-9102'],
      total_exposure: 910000.0,
      primary_infrastructure_ip: '198.51.100.24',
      primary_mule_account: 'SUNRISE TRADERS (50100234567801)',
      primary_upi: 'ravi@xupi',
      risk_score: 95,
      status: 'ACTIVE_OPERATING_RING',
      recommended_action: 'Joint Multi-FIR Inter-State Special Investigation Team (SIT) Escalation under BNSS §94 & §106'
    }
  ];

  // Module state
  const state = {
    selectedCaseA: 'CR-2026-OCT-4287',
    selectedCaseB: 'TG-2026-0841',
    activeFilter: 'ALL',
    searchTerm: '',
    cases: PRESEEDED_CASES,
    sharedEntities: PRESEEDED_SHARED,
    syndicates: PRESEEDED_SYNDICATES,
    selectedGraphNode: null
  };

  // Format money helper
  function formatINR(val) {
    if (!val || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  }

  // --- 2. PAIRWISE OVERLAP CALCULATION LOGIC ---
  function calculateOverlap(caseAId, caseBId) {
    const caseA = state.cases.find(c => c.case_id === caseAId) || state.cases[0];
    const caseB = state.cases.find(c => c.case_id === caseBId) || state.cases[1];

    if (!caseA || !caseB || caseAId === caseBId) {
      return {
        caseA,
        caseB,
        overlapScore: 0,
        sharedItems: [],
        totalSharedVolume: 0
      };
    }

    const sharedItems = [];
    let score = 0;
    let totalVolume = 0;

    // Check accounts
    const accsA = caseA.accounts || [];
    const accsB = caseB.accounts || [];
    accsA.forEach(a => {
      const match = accsB.find(b => b.account_no === a.account_no);
      if (match) {
        const combVol = (a.amount || 0) + (match.amount || 0);
        totalVolume += combVol;
        score += 45;
        sharedItems.push({
          type: 'BANK_ACCOUNT',
          value: a.account_no,
          label: `${a.holder_name} (${a.account_no})`,
          detail: `${a.bank} · Combined Volume: ${formatINR(combVol)}`,
          caseARole: `${a.role} (${formatINR(a.amount)})`,
          caseBRole: `${match.role} (${formatINR(match.amount)})`,
          severity: 'CRITICAL',
          highlight: 'Shared Bank Account'
        });
      }
    });

    // Check IPs
    const ipsA = (caseA.infrastructure && caseA.infrastructure.ips) || [];
    const ipsB = (caseB.infrastructure && caseB.infrastructure.ips) || [];
    ipsA.forEach(ip => {
      if (ipsB.includes(ip)) {
        score += 25;
        sharedItems.push({
          type: 'IP_ADDRESS',
          value: ip,
          label: `Hosting IP: ${ip}`,
          detail: 'DigitalOcean VPS Netherlands / FastHost Offshore ASN',
          caseARole: `Hosts ${caseA.infrastructure.domains?.[0] || 'Phishing Portal'}`,
          caseBRole: `Hosts ${caseB.infrastructure.domains?.[0] || 'Task Escrow Portal'}`,
          severity: 'CRITICAL',
          highlight: 'Shared Hosting Infrastructure'
        });
      }
    });

    // Check UPI
    if (caseA.primary_upi && caseA.primary_upi === caseB.primary_upi) {
      score += 20;
      sharedItems.push({
        type: 'UPI_HANDLE',
        value: caseA.primary_upi,
        label: `UPI VPA: ${caseA.primary_upi}`,
        detail: 'Immediate collection handle linked across both syndicates',
        caseARole: 'Direct victim lure & collection handle',
        caseBRole: 'Telegram task recharge settlement VPA',
        severity: 'HIGH',
        highlight: 'Shared Collection UPI'
      });
    }

    // Check Phones
    const phonesA = caseA.phones || [];
    const phonesB = caseB.phones || [];
    phonesA.forEach(p => {
      if (phonesB.includes(p)) {
        score += 20;
        sharedItems.push({
          type: 'PHONE_NUMBER',
          value: p,
          label: `Calling / WhatsApp Number: ${p}`,
          detail: 'Active SIM used for social engineering & lure dispatch',
          caseARole: 'Lure Caller & Social Engineering Contact',
          caseBRole: 'SMS Disconnection Threat Caller',
          severity: 'HIGH',
          highlight: 'Shared Lure Phone'
        });
      }
    });

    // Check Domains
    const domsA = (caseA.infrastructure && caseA.infrastructure.domains) || [];
    const domsB = (caseB.infrastructure && caseB.infrastructure.domains) || [];
    domsA.forEach(d => {
      const dName = typeof d === 'string' ? d : d.domain;
      const match = domsB.find(b => (typeof b === 'string' ? b : b.domain) === dName);
      if (match) {
        score += 15;
        sharedItems.push({
          type: 'DOMAIN',
          value: dName,
          label: `Domain: ${dName}`,
          detail: 'Shared Ingress Phishing & Credential Harvester',
          caseARole: 'Phishing Ingress Portal',
          caseBRole: 'Task Escrow Ingress Portal',
          severity: 'HIGH',
          highlight: 'Shared Phishing Domain'
        });
      }
    });

    return {
      caseA,
      caseB,
      overlapScore: Math.min(score, 100),
      sharedItems,
      totalSharedVolume: totalVolume
    };
  }

  // --- 3. ASYNC INITIALIZATION (HYDRATE FROM BACKEND IF AVAILABLE) ---
  function init() {
    fetch((window.BACKEND_API_URL || '') + '/api/cross-case/links')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (data.shared_entities && data.shared_entities.length) {
            state.sharedEntities = data.shared_entities;
          }
        }
      })
      .catch(() => {
        // Fallback silently to pre-seeded dataset
      });

    fetch((window.BACKEND_API_URL || '') + '/api/cross-case/syndicates')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.syndicates && data.syndicates.length) {
          state.syndicates = data.syndicates;
        }
      })
      .catch(() => {
        // Fallback silently to pre-seeded dataset
      });

    fetch((window.BACKEND_API_URL || '') + '/api/cases')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.cases && data.cases.length) {
          // Merge with detailed accounts
          data.cases.forEach(c => {
            const existing = state.cases.find(x => x.case_id === c.case_id);
            if (existing) {
              Object.assign(existing, c);
            }
          });
        }
      })
      .catch(() => {
        // Fallback silently
      });
  }

  // --- 4. RENDER RELATIONSHIPS & SYNDICATE RADAR PAGE ---
  function renderRelationshipsPage() {
    const overlap = calculateOverlap(state.selectedCaseA, state.selectedCaseB);
    const syn = state.syndicates[0] || PRESEEDED_SYNDICATES[0];

    // Filter shared entities
    const filteredEntities = state.sharedEntities.filter(ent => {
      if (state.activeFilter !== 'ALL' && ent.entity_type !== state.activeFilter) {
        return false;
      }
      if (state.searchTerm) {
        const q = state.searchTerm.toLowerCase();
        const str = (ent.label + ' ' + ent.entity_value + ' ' + ent.entity_type).toLowerCase();
        return str.includes(q);
      }
      return true;
    });

    return `
      <div class="cross-case-hub">
        <!-- 1. HEADER BANNER -->
        <div class="cross-case-banner">
          <div class="cross-case-banner-left">
            <div class="radar-pulse-icon">⋈</div>
            <div class="cross-case-banner-title">
              <h2>Cross-Case Forensic Intelligence & Syndicate Radar</h2>
              <p>Multi-FIR automated intelligence linking repeating accounts, UPI handles, phones, and C2 hosting infrastructure across criminal cases.</p>
            </div>
          </div>
          <div class="cross-case-banner-badge">
            <span class="syndicate-live-tag"><i></i> SYNDICATE RADAR ACTIVE</span>
            <small style="color:#b0c9dd;font-size:10px">${state.cases.length} Interconnected FIRs Analyzed</small>
          </div>
        </div>

        <!-- 2. TOP KPI METRIC STRIP -->
        <div class="cross-case-kpis">
          <div class="cross-kpi-card">
            <span>Interlinked Cases</span>
            <strong>${state.cases.length} FIRs</strong>
            <small>Active cross-jurisdiction cases</small>
          </div>
          <div class="cross-kpi-card alert-card">
            <span>Shared Mule Accounts</span>
            <strong>3 Accounts</strong>
            <small>Multi-case fund collectors</small>
          </div>
          <div class="cross-kpi-card">
            <span>Shared Hosting C2</span>
            <strong>198.51.100.24</strong>
            <small>Offshore VPS infrastructure</small>
          </div>
          <div class="cross-kpi-card">
            <span>Shared UPI & Contact</span>
            <strong>ravi@xupi</strong>
            <small>Linked WhatsApp & VPA</small>
          </div>
          <div class="cross-kpi-card alert-card">
            <span>Total Syndicated Volume</span>
            <strong>${formatINR(syn.total_exposure || 910000)}</strong>
            <small>Aggregated fraud exposure</small>
          </div>
        </div>

        <!-- 3. MAIN SPLIT: CASE OVERLAP COMPARATOR & SYNDICATE OVERLAP GRAPH -->
        <div class="cross-case-grid-split">
          
          <!-- 3.1 CASE-TO-CASE COMPARATOR & OVERLAP MATRIX -->
          <div class="comparator-card">
            <div class="comparator-head">
              <h3><span>⚖️</span> Case Overlap Matrix: Side-by-Side Verification</h3>
              <span class="pill pill-muted" style="font-size:9px">Select any 2 Cases to Expose Links</span>
            </div>

            <!-- Case Selectors -->
            <div class="comparator-selector-bar">
              <div class="case-select-box">
                <label>Case A (Primary FIR)</label>
                <select id="caseSelectA">
                  ${state.cases.map(c => `
                    <option value="${c.case_id}" ${c.case_id === state.selectedCaseA ? 'selected' : ''}>
                      ${c.case_id} · ${c.title.length > 24 ? c.title.slice(0, 24) + '...' : c.title}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="comparator-vs-badge">VS</div>

              <div class="case-select-box">
                <label>Case B (Comparative FIR)</label>
                <select id="caseSelectB">
                  ${state.cases.map(c => `
                    <option value="${c.case_id}" ${c.case_id === state.selectedCaseB ? 'selected' : ''}>
                      ${c.case_id} · ${c.title.length > 24 ? c.title.slice(0, 24) + '...' : c.title}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Overlap Score Banner -->
            <div class="overlap-score-banner">
              <div class="overlap-score-banner-left">
                <div class="overlap-score-circle">${overlap.overlapScore}%</div>
                <div>
                  <strong>${overlap.overlapScore >= 80 ? 'CRITICAL SYNDICATE MATCH' : overlap.overlapScore >= 50 ? 'HIGH PROBABILITY LINK' : 'LOW OVERLAP'}</strong>
                  <span>${overlap.sharedItems.length} Shared Forensic Indicators Identified between Cases</span>
                </div>
              </div>
              <div class="overlap-score-banner-right">
                ${overlap.totalSharedVolume > 0 ? `Shared Volume: <b>${formatINR(overlap.totalSharedVolume)}</b>` : 'Infrastructure Overlap'}
              </div>
            </div>

            <!-- Overlap Evidence Items -->
            <div class="overlap-evidence-list">
              ${overlap.sharedItems.length > 0 ? overlap.sharedItems.map(item => `
                <div class="overlap-item ${item.severity.toLowerCase()}">
                  <div class="overlap-item-head">
                    <span class="overlap-type-tag tag-${item.type.split('_')[0].toLowerCase()}">${item.highlight}</span>
                    <span class="pill pill-high" style="font-size:8px">${item.severity}</span>
                  </div>
                  <div class="overlap-item-val">${item.label}</div>
                  <div style="font-size:10px;color:#64788b;margin-top:2px">${item.detail}</div>
                  <div class="overlap-item-meta">
                    <div class="overlap-meta-col">
                      <span>In Case A (${overlap.caseA.case_id}):</span>
                      <strong>${item.caseARole}</strong>
                    </div>
                    <div class="overlap-meta-col">
                      <span>In Case B (${overlap.caseB.case_id}):</span>
                      <strong>${item.caseBRole}</strong>
                    </div>
                  </div>
                </div>
              `).join('') : `
                <div class="empty-state" style="padding:24px;border:1px dashed #ccd7df;border-radius:6px">
                  <b>No Direct Overlap Found</b>
                  <small>Select different cases from the dropdown above to view cross-case linkages.</small>
                </div>
              `}
            </div>
          </div>

          <!-- 3.2 INTERACTIVE SVG SYNDICATE GRAPH & RADAR DOSSIER -->
          <div style="display:flex;flex-direction:column;gap:16px">
            
            <div class="syndicate-graph-card">
              <div class="syndicate-graph-head">
                <h3><span>🕸️</span> Syndicate Infrastructure Graph</h3>
                <span class="pill pill-muted" style="font-size:9px">Bipartite Multi-Case Topology</span>
              </div>

              <div class="graph-legend-strip">
                <span class="legend-item"><i class="legend-dot legend-case"></i> Case Node</span>
                <span class="legend-item"><i class="legend-dot legend-account"></i> Bank Account</span>
                <span class="legend-item"><i class="legend-dot legend-ip"></i> C2 IP</span>
                <span class="legend-item"><i class="legend-dot legend-upi"></i> UPI / Phone</span>
              </div>

              <!-- SVG Network Viewport -->
              <div class="syndicate-svg-container" id="syndicateSvgContainer">
                ${renderSyndicateSvg()}
              </div>

              <div style="margin-top:10px;font-size:9px;color:#64788b;display:flex;justify-content:space-between">
                <span>Hover or click any node to highlight linked cases and shared infrastructure.</span>
                <span>Zoom / Pan: Static Forensic Layout</span>
              </div>
            </div>

            <!-- SYNDICATE STATUTORY DOSSIER -->
            <div class="syndicate-dossier-card">
              <div class="syndicate-dossier-head">
                <h4>🏛️ Syndicate Profile: ${syn.name}</h4>
                <span class="risk-tag critical">${syn.status}</span>
              </div>
              <div class="syndicate-dossier-body">
                This multi-case cluster connects <b>3 separate police stations</b> across Rajasthan and Central Cyber Crime Cell. Proceeds from Telegram task scams and investment scams were routed into shared aggregator account <b>SUNRISE TRADERS (50100234567801)</b> and layered into <b>R K EXPORTS</b>, resolving to offshore C2 hosting IP <b>198.51.100.24</b>.
              </div>
              <div class="syndicate-action-box">
                <span>🚨</span>
                <div>
                  <strong>Recommended Statutory Escalation:</strong>
                  <p>${syn.recommended_action}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- 4. COMPREHENSIVE SHARED INDICATORS LEDGER -->
        <div class="shared-ledger-card">
          <div class="ledger-toolbar">
            <div style="display:flex;align-items:center;gap:12px">
              <h3 style="margin:0;font-size:14px;color:#172e43"><span>📋</span> Master Cross-Case Indicators Ledger</h3>
              <span class="pill pill-muted">${filteredEntities.length} Total Shared Indicators</span>
            </div>

            <div style="display:flex;gap:10px;align-items:center">
              <div class="ledger-filters">
                <button class="filter-btn ${state.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All (${state.sharedEntities.length})</button>
                <button class="filter-btn ${state.activeFilter === 'BANK_ACCOUNT' ? 'active' : ''}" data-filter="BANK_ACCOUNT">Accounts</button>
                <button class="filter-btn ${state.activeFilter === 'IP_ADDRESS' ? 'active' : ''}" data-filter="IP_ADDRESS">IPs</button>
                <button class="filter-btn ${state.activeFilter === 'UPI_HANDLE' ? 'active' : ''}" data-filter="UPI_HANDLE">UPI</button>
                <button class="filter-btn ${state.activeFilter === 'PHONE_NUMBER' ? 'active' : ''}" data-filter="PHONE_NUMBER">Phones</button>
                <button class="filter-btn ${state.activeFilter === 'DOMAIN' ? 'active' : ''}" data-filter="DOMAIN">Domains</button>
              </div>

              <div class="ledger-search-box">
                <span>🔍</span>
                <input type="text" id="ledgerSearchInput" placeholder="Filter entities..." value="${state.searchTerm}">
              </div>
            </div>
          </div>

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>INDICATOR & ENTITY</th>
                  <th>TYPE</th>
                  <th>LINKED CASES</th>
                  <th>AGGREGATED EXPOSURE</th>
                  <th>SEVERITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEntities.map(ent => `
                  <tr>
                    <td>
                      <b style="color:#163d5d;font-family:var(--mono)">${ent.entity_value}</b>
                      <small style="color:#64788b">${ent.label}</small>
                    </td>
                    <td>
                      <span class="overlap-type-tag tag-${ent.entity_type.split('_')[0].toLowerCase()}">${ent.entity_type.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;flex-wrap:wrap">
                        ${ent.cases.map(c => `
                          <span class="pill pill-muted" style="font-size:8px" title="${c.role || ''}">${c.case_id}</span>
                        `).join('')}
                      </div>
                    </td>
                    <td>
                      <span class="amount" style="font-weight:700">${ent.total_volume > 0 ? formatINR(ent.total_volume) : 'Infrastructure'}</span>
                    </td>
                    <td>
                      <span class="risk-tag ${ent.severity.toLowerCase()}">${ent.severity}</span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-compare-ent" 
                              style="padding:4px 8px;font-size:9px"
                              data-case-a="${ent.cases[0]?.case_id || 'CR-2026-OCT-4287'}"
                              data-case-b="${ent.cases[1]?.case_id || 'TG-2026-0841'}">
                        Compare Cases →
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  // --- 5. RENDER INTERACTIVE SVG SYNDICATE NETWORK ---
  function renderSyndicateSvg() {
    // Layout coordinates in a 460x420 viewBox
    // 3 Case Nodes on Left/Right/Bottom:
    // Case A: (70, 80)
    // Case B: (390, 80)
    // Case C: (230, 360)
    // Central Bridge Entities:
    // IP 198.51.100.24 (Center): (230, 180) - links A, B, C
    // Bank 50100234567801 (Sunrise): (230, 70) - links A, B
    // UPI ravi@xupi: (230, 125) - links A, B
    // Bank XBNK0003344 (R K Exports): (130, 240) - links A, C
    // Bank ACC-MA-1108 (MA Traders): (330, 240) - links B, C
    // Phone +91-9876543210: (330, 310) - links B, C

    return `
      <svg viewBox="0 0 460 420" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
          </filter>
        </defs>

        <!-- Connecting Edges -->
        <!-- Case A to Sunrise Traders -->
        <line x1="70" y1="80" x2="230" y2="70" class="syn-edge active" />
        <!-- Case B to Sunrise Traders -->
        <line x1="390" y1="80" x2="230" y2="70" class="syn-edge active" />

        <!-- Case A to ravi@xupi -->
        <line x1="70" y1="80" x2="230" y2="125" class="syn-edge active" />
        <!-- Case B to ravi@xupi -->
        <line x1="390" y1="80" x2="230" y2="125" class="syn-edge active" />

        <!-- Case A, B, C to Shared IP 198.51.100.24 -->
        <line x1="70" y1="80" x2="230" y2="180" class="syn-edge active" stroke="#0284c7" />
        <line x1="390" y1="80" x2="230" y2="180" class="syn-edge active" stroke="#0284c7" />
        <line x1="230" y1="360" x2="230" y2="180" class="syn-edge active" stroke="#0284c7" />

        <!-- Case A and Case C to R K Exports -->
        <line x1="70" y1="80" x2="130" y2="240" class="syn-edge active" />
        <line x1="230" y1="360" x2="130" y2="240" class="syn-edge active" />

        <!-- Case B and Case C to MA Traders -->
        <line x1="390" y1="80" x2="330" y2="240" class="syn-edge active" />
        <line x1="230" y1="360" x2="330" y2="240" class="syn-edge active" />

        <!-- Case B and Case C to Phone -->
        <line x1="390" y1="80" x2="330" y2="310" class="syn-edge active" />
        <line x1="230" y1="360" x2="330" y2="310" class="syn-edge active" />

        <!-- Bridge Entity Nodes -->
        <!-- 1. SUNRISE TRADERS (Shared Bank Account) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="SUNRISE TRADERS (50100234567801) - Shared Account across Case A & B">
          <circle cx="230" cy="70" r="16" fill="#b73943" stroke="#fff" stroke-width="2" />
          <text x="230" y="74" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">🏦</text>
          <text x="230" y="50" text-anchor="middle" fill="#991b1b" font-size="9" font-weight="bold" font-family="monospace">50100234567801 (₹6.3L)</text>
        </g>

        <!-- 2. ravi@xupi (Shared UPI) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="ravi@xupi - Shared UPI VPA across Case A & B">
          <circle cx="230" cy="125" r="13" fill="#d97706" stroke="#fff" stroke-width="2" />
          <text x="230" y="129" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">₹</text>
          <text x="230" y="147" text-anchor="middle" fill="#92400e" font-size="8" font-weight="bold" font-family="monospace">ravi@xupi</text>
        </g>

        <!-- 3. 198.51.100.24 (Shared C2 IP) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="198.51.100.24 - Shared Hosting IP across Cases A, B, and C">
          <circle cx="230" cy="180" r="18" fill="#0284c7" stroke="#fff" stroke-width="2.5" />
          <text x="230" y="184" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">🌐</text>
          <text x="230" y="208" text-anchor="middle" fill="#0369a1" font-size="9" font-weight="bold" font-family="monospace">198.51.100.24 (3 FIRs)</text>
        </g>

        <!-- 4. R K EXPORTS (Layering Mule) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="R K EXPORTS (XBNK0003344) - Shared Layering Mule across Case A & C">
          <circle cx="130" cy="240" r="14" fill="#b73943" stroke="#fff" stroke-width="2" />
          <text x="130" y="244" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">🏦</text>
          <text x="130" y="264" text-anchor="middle" fill="#991b1b" font-size="8" font-weight="bold" font-family="monospace">R K EXPORTS (₹3.55L)</text>
        </g>

        <!-- 5. MA TRADERS (Collector Mule) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="MA TRADERS (ACC-MA-1108) - Shared Collector across Case B & C">
          <circle cx="330" cy="240" r="14" fill="#b73943" stroke="#fff" stroke-width="2" />
          <text x="330" y="244" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">🏦</text>
          <text x="330" y="264" text-anchor="middle" fill="#991b1b" font-size="8" font-weight="bold" font-family="monospace">MA TRADERS (₹4.25L)</text>
        </g>

        <!-- 6. Shared Phone (+91-9876543210) -->
        <g class="syn-node-group" filter="url(#nodeGlow)" title="+91-9876543210 - Shared Contact across Case B & C">
          <circle cx="330" cy="310" r="12" fill="#7c3aed" stroke="#fff" stroke-width="2" />
          <text x="330" y="314" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">📞</text>
          <text x="330" y="332" text-anchor="middle" fill="#6d28d9" font-size="8" font-weight="bold" font-family="monospace">+91-9876543210</text>
        </g>

        <!-- Case Hub Nodes -->
        <!-- Case A Node -->
        <g class="syn-node-group" filter="url(#nodeGlow)">
          <rect x="15" y="55" width="110" height="48" rx="6" fill="#12527a" stroke="#fff" stroke-width="2" />
          <text x="70" y="74" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold" font-family="monospace">CR-2026-OCT-4287</text>
          <text x="70" y="90" text-anchor="middle" fill="#b0c9dd" font-size="8">Sunrise Invest (₹4.85L)</text>
        </g>

        <!-- Case B Node -->
        <g class="syn-node-group" filter="url(#nodeGlow)">
          <rect x="335" y="55" width="110" height="48" rx="6" fill="#12527a" stroke="#fff" stroke-width="2" />
          <text x="390" y="74" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold" font-family="monospace">TG-2026-0841</text>
          <text x="390" y="90" text-anchor="middle" fill="#b0c9dd" font-size="8">Task Scam (₹1.85L)</text>
        </g>

        <!-- Case C Node -->
        <g class="syn-node-group" filter="url(#nodeGlow)">
          <rect x="175" y="340" width="110" height="48" rx="6" fill="#12527a" stroke="#fff" stroke-width="2" />
          <text x="230" y="359" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold" font-family="monospace">FIR-2026-NOV-9102</text>
          <text x="230" y="375" text-anchor="middle" fill="#b0c9dd" font-size="8">Power Bill Phish (₹2.4L)</text>
        </g>
      </svg>
    `;
  }

  // --- 6. EVENT WIRING ---
  function wireEvents() {
    const selA = document.getElementById('caseSelectA');
    const selB = document.getElementById('caseSelectB');

    if (selA && selB) {
      selA.addEventListener('change', (e) => {
        state.selectedCaseA = e.target.value;
        refreshPage();
      });

      selB.addEventListener('change', (e) => {
        state.selectedCaseB = e.target.value;
        refreshPage();
      });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        state.activeFilter = filter;
        refreshPage();
      });
    });

    // Search input
    const searchInput = document.getElementById('ledgerSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        refreshPage();
      });
    }

    // Compare Entity buttons in table
    document.querySelectorAll('.btn-compare-ent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const caseA = e.currentTarget.dataset.caseA;
        const caseB = e.currentTarget.dataset.caseB;
        if (caseA && caseB) {
          state.selectedCaseA = caseA;
          state.selectedCaseB = caseB;
          refreshPage();
        }
      });
    });
  }

  function refreshPage() {
    const pageEl = document.getElementById('page');
    if (pageEl && window.state && window.state.page === 'relationships') {
      pageEl.innerHTML = renderRelationshipsPage();
      wireEvents();
    }
  }

  // Helper to switch view directly to comparison
  function navigateToComparison(caseA, caseB) {
    state.selectedCaseA = caseA;
    state.selectedCaseB = caseB;
    if (window.state) {
      window.state.page = 'relationships';
      const navItem = document.querySelector('[data-page="relationships"]');
      if (navItem) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        navItem.classList.add('active');
      }
      refreshPage();
    }
  }

  // --- 7. EXTERNAL CONTEXTUAL BADGE HELPERS ---

  /**
   * Returns a glowing warning badge for Money Trail Node cards
   */
  function renderNodeBadge(nodeId) {
    if (!nodeId) return '';
    const n = String(nodeId).toUpperCase();
    if (n.includes('50100234567801') || n.includes('SUNRISE')) {
      return `<span class="cross-case-pill-alert" title="Cross-Case Link: Also active in Case TG-2026-0841 (₹6.3L total syndicate volume)">🔗 Multi-Case (2 FIRs)</span>`;
    }
    if (n.includes('XBNK0003344') || n.includes('R K EXPORTS')) {
      return `<span class="cross-case-pill-alert" title="Cross-Case Link: Also active in Case FIR-2026-NOV-9102">🔗 Multi-Case (2 FIRs)</span>`;
    }
    if (n.includes('ACC-MA-1108') || n.includes('MA TRADERS')) {
      return `<span class="cross-case-pill-alert" title="Cross-Case Link: Active across Cases TG-2026-0841 & FIR-2026-NOV-9102">🔗 Multi-Case (2 FIRs)</span>`;
    }
    return '';
  }

  /**
   * Returns a detailed cross-case alert section for the Money Trail Drawer Summary tab
   */
  function renderDrawerCrossCaseSection(nodeId) {
    if (!nodeId) return '';
    const n = String(nodeId).toUpperCase();
    if (n.includes('50100234567801') || n.includes('SUNRISE')) {
      return `
        <div class="cross-case-drawer-alert">
          <strong>🚨 Cross-Case Syndicate Linkage Match</strong>
          <p>This account <b>SUNRISE TRADERS (50100234567801)</b> is concurrently identified in <b>Case #TG-2026-0841</b> (Work-from-Home Telegram Task Scam) with ₹1,45,000 inflow. Shared hosting IP: <b>198.51.100.24</b>. Total combined syndicate volume: <b>₹6,30,000</b>.</p>
          <button onclick="window.CrossCaseModule.navigateToComparison('CR-2026-OCT-4287', 'TG-2026-0841')">View Cross-Case Overlap Matrix →</button>
        </div>
      `;
    }
    if (n.includes('XBNK0003344') || n.includes('R K EXPORTS')) {
      return `
        <div class="cross-case-drawer-alert">
          <strong>🚨 Cross-Case Layering Linkage Match</strong>
          <p>Account <b>R K EXPORTS (XBNK0003344)</b> also received ₹1,80,000 in <b>Case #FIR-2026-NOV-9102</b> (Fake Electricity Bill Phishing). Shared offshore C2: <b>198.51.100.24</b>.</p>
          <button onclick="window.CrossCaseModule.navigateToComparison('CR-2026-OCT-4287', 'FIR-2026-NOV-9102')">View Cross-Case Overlap Matrix →</button>
        </div>
      `;
    }
    return '';
  }

  /**
   * Returns a pill for the Mule Account Detector list
   */
  function renderMuleBadge(accountId) {
    if (!accountId) return '';
    const a = String(accountId).toUpperCase();
    if (a.includes('50100234567801') || a.includes('SUNRISE') || a.includes('XBNK0003344') || a.includes('ACC-MA-1108')) {
      return `<span class="cross-case-badge-mule" title="Shared entity across multiple cyber crime cases">🔗 Cross-Case Hit</span>`;
    }
    return '';
  }

  /**
   * Returns a warning card inside the Mule Reason Panel
   */
  function renderMuleReasonAlert(accountId) {
    if (!accountId) return '';
    const a = String(accountId).toUpperCase();
    if (a.includes('50100234567801') || a.includes('SUNRISE')) {
      return `
        <div class="cross-case-mule-alert">
          <strong>🚨 Cross-Case Intelligence Hit: Repeating Syndicate Mule</strong>
          <p>This account also received ₹1,45,000 in Case <b>TG-2026-0841</b> and shares C2 Hosting IP <b>198.51.100.24</b> and UPI <b>ravi@xupi</b>. Recommended for Joint Interstate Freezing under §106 BNSS 2023.</p>
        </div>
      `;
    }
    return '';
  }

  /**
   * Returns a warning pill for Domains & IPs inspector
   */
  function renderIntelBadge(domainOrIp) {
    if (!domainOrIp) return '';
    const s = String(domainOrIp).trim();
    if (s === '198.51.100.24') {
      return `<span class="cross-case-pill-alert" title="Identified as C2 hosting across 3 separate FIRs">🚨 Shared Infrastructure (3 FIRs)</span>`;
    }
    return '';
  }

  // Auto-init on script load
  init();

  // Expose global module
  window.CrossCaseModule = {
    init,
    renderRelationshipsPage,
    wireEvents,
    getCaseOverlap: calculateOverlap,
    navigateToComparison,
    renderNodeBadge,
    renderDrawerCrossCaseSection,
    renderMuleBadge,
    renderMuleReasonAlert,
    renderIntelBadge
  };

})();
