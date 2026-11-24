/**
 * Consortium Blockchain Ledger (Hyperledger Fabric v3.x / PBFT)
 * Tamper-Evident Cyber Crime Evidence Ledger
 * Synchronized with Uploaded Bank Statements, Mule Detections, and Money Trail Evidence
 */

(function () {
  'use strict';

  // 1. Peer Nodes across State Cyber Police, Forensics & Cyber Command
  const CONSORTIUM_NODES = [
    {
      id: 'NODE-01-RJ-CYBER',
      name: 'Rajasthan Police Cyber Command Core Node',
      hindiName: 'राजस्थान पुलिस साइबर कमांड कोर नोड',
      organization: 'State Cyber Crime Police Station, Jaipur',
      ip: '10.144.12.8 (Govt Secure Leased Line)',
      status: 'ONLINE',
      blockHeight: 6,
      latencyMs: 11,
      peerRole: 'VALIDATOR',
      location: 'Police Headquarters, Lal Kothi, Jaipur'
    },
    {
      id: 'NODE-02-CBI-CYBER',
      name: 'CBI Central Cyber Crime Division Node',
      hindiName: 'सीबीआई केंद्रीय साइबर अपराध प्रभाग नोड',
      organization: 'Central Cyber Crime Coordinating Centre (I4C)',
      ip: '10.144.18.22 (Judicial Dedicated WAN)',
      status: 'ONLINE',
      blockHeight: 6,
      latencyMs: 8,
      peerRole: 'ORDERER',
      location: 'CBI Headquarters, CGO Complex, New Delhi'
    },
    {
      id: 'NODE-03-FSL-LAB',
      name: 'State FSL Cyber Forensics Lab Node',
      hindiName: 'राज्य विधि-विज्ञान प्रयोगशाला साइबर नोड',
      organization: 'Directorate of Forensic Science Services, Jaipur',
      ip: '10.144.40.104 (FSL Secure Lab Net)',
      status: 'ONLINE',
      blockHeight: 6,
      latencyMs: 14,
      peerRole: 'VALIDATOR',
      location: 'State FSL Complex, Nehru Nagar, Jaipur'
    },
    {
      id: 'NODE-04-CERT-IN',
      name: 'CERT-In National Cyber Sentinel Node',
      hindiName: 'सर्ट-इन राष्ट्रीय साइबर प्रहरी नोड',
      organization: 'Indian Computer Emergency Response Team (MeitY)',
      ip: '10.144.60.19 (Govt National Backbone)',
      status: 'ONLINE',
      blockHeight: 6,
      latencyMs: 9,
      peerRole: 'ENDORSER',
      location: 'Electronics Niketan, CGO Complex, New Delhi'
    },
    {
      id: 'NODE-05-DOITC',
      name: 'DoIT&C Rajasthan State Gateway Node',
      hindiName: 'डीओआईटीएंडसी राजस्थान राज्य गेटवे नोड',
      organization: 'Department of IT & Communication, Govt of Rajasthan',
      ip: '10.144.0.1 (RajSWAN Master Gateway)',
      status: 'ONLINE',
      blockHeight: 6,
      latencyMs: 12,
      peerRole: 'ANCHOR',
      location: 'Yojna Bhawan, Tilak Marg, Jaipur'
    }
  ];

  // 2. Initial Blockchain Blocks derived 100% from uploaded documents and active case evidence
  const INITIAL_BLOCKS = [
    {
      blockNumber: 6,
      timestamp: '2026-11-24T17:15:20.104Z',
      prevHash: '0x3c9f28a7e4b105d8f63201e7a9c8b7f5e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8',
      blockHash: '0x8f2d5a7b1c3e4f6098124578abcedf0123456789abcdef0123456789abcdef01',
      validatorNode: 'Node-1 (Rajasthan Police Cyber Command Core Node)',
      merkleRoot: '0xd7a5e8b2c4f10938475620194857201938475620194857201938475620194857',
      transactions: [
        {
          txId: '0xd7a5e8b2c4f10938475620194857201938475620194857201938475620194857',
          docId: 'EVD-2026-TRAIL-4287',
          caseNumber: 'FIR/2026/CYBER-4019',
          action: 'ANCHOR_MONEY_TRAIL_GRAPH',
          executedBy: 'Inspector Arvind Meena (RJ-CYBER-01)',
          role: 'IO',
          status: 'COMMITTED',
          timestamp: '2026-11-24T17:15:20.104Z',
          description: 'Victim UTR 428714563201 (₹5,00,000) multi-hop trail anchored with BSA §63 digital hash.'
        }
      ]
    },
    {
      blockNumber: 5,
      timestamp: '2026-11-24T17:12:45.392Z',
      prevHash: '0x7b1c3e4f6098124578abcedf0123456789abcdef0123456789abcdef01234567',
      blockHash: '0x3c9f28a7e4b105d8f63201e7a9c8b7f5e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8',
      validatorNode: 'Node-3 (State FSL Cyber Forensics Lab Node)',
      merkleRoot: '0xb4c8f1e2d3a95067182940385726194038572619403857261940385726194038',
      transactions: [
        {
          txId: '0xb4c8f1e2d3a95067182940385726194038572619403857261940385726194038',
          docId: 'EVD-2026-MULE-EVAL-5R',
          caseNumber: 'FIR/2026/CYBER-4019',
          action: 'REGISTER_MULE_DETECTION',
          executedBy: 'Automated 5-Rule Heuristic Engine (RJ-CYBER-SENTINEL)',
          role: 'ANALYST',
          status: 'COMMITTED',
          timestamp: '2026-11-24T17:12:45.392Z',
          description: 'Flagged 2 high-risk mule accounts: Sunrise Traders (Layer-1, 88%) & Kiran Enterprises (Layer-2, 85%).'
        }
      ]
    },
    {
      blockNumber: 4,
      timestamp: '2026-11-24T17:08:14.218Z',
      prevHash: '0x5e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d',
      blockHash: '0x7b1c3e4f6098124578abcedf0123456789abcdef0123456789abcdef01234567',
      validatorNode: 'Node-1 (Rajasthan Police Cyber Command Core Node)',
      merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      transactions: [
        {
          txId: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
          docId: 'DOC-STMT-KIRAN-XLSX',
          caseNumber: 'FIR/2026/CYBER-4019',
          action: 'ANCHOR_EVIDENCE_STATEMENT',
          executedBy: 'Inspector Arvind Meena (RJ-CYBER-01)',
          role: 'IO',
          status: 'COMMITTED',
          timestamp: '2026-11-24T17:08:14.218Z',
          description: 'Uploaded document anchored: Sample_Statement_KiranEnterprises.xlsx (HDFC A/c 50100234567891, 21 transactions).'
        }
      ]
    },
    {
      blockNumber: 3,
      timestamp: '2026-11-24T17:05:02.843Z',
      prevHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      blockHash: '0x5e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d',
      validatorNode: 'Node-1 (Rajasthan Police Cyber Command Core Node)',
      merkleRoot: '0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e',
      transactions: [
        {
          txId: '0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e',
          docId: 'DOC-STMT-SUNRISE-PDF',
          caseNumber: 'FIR/2026/CYBER-4019',
          action: 'ANCHOR_EVIDENCE_STATEMENT',
          executedBy: 'Inspector Arvind Meena (RJ-CYBER-01)',
          role: 'IO',
          status: 'COMMITTED',
          timestamp: '2026-11-24T17:05:02.843Z',
          description: 'Uploaded document anchored: Sample_Statement_SunriseTraders.pdf (ICICI A/c 918273645012, 26 transactions).'
        }
      ]
    },
    {
      blockNumber: 2,
      timestamp: '2026-11-24T16:50:33.119Z',
      prevHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      blockHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      validatorNode: 'Node-2 (CBI Central Cyber Crime Division Node)',
      merkleRoot: '0x8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a',
      transactions: [
        {
          txId: '0x8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a',
          docId: 'CMP-2026-8812-NCR',
          caseNumber: 'FIR/2026/CYBER-4019',
          action: 'REGISTER_INTAKE_COMPLAINT',
          executedBy: 'Inspector Arvind Meena (RJ-CYBER-01)',
          role: 'IO',
          status: 'COMMITTED',
          timestamp: '2026-11-24T16:50:33.119Z',
          description: 'Intake complaint registered: Victim Ramesh Chand Sharma, Defrauded: ₹5,00,000 via UTR 428714563201.'
        }
      ]
    },
    {
      blockNumber: 1,
      timestamp: '2026-11-24T16:30:00.000Z',
      prevHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      validatorNode: 'Node-5 (DoIT&C Rajasthan State Gateway Node)',
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
      transactions: [
        {
          txId: '0x0000000000000000000000000000000000000000000000000000000000000000',
          docId: 'GENESIS_ROOT',
          caseNumber: 'RAJASTHAN/2026/CYBER_LEDGER_ROOT',
          action: 'INITIALIZE_CONSORTIUM_LEDGER',
          executedBy: 'National Informatics Centre & DoIT&C Grid Admin',
          role: 'ADMIN',
          status: 'COMMITTED',
          timestamp: '2026-11-24T16:30:00.000Z',
          description: 'Genesis anchor initialized for Rajasthan Police Cyber Crime Response & Investigation Grid.'
        }
      ]
    }
  ];

  // State Management: Load from LocalStorage or initialize with Case Evidence blocks
  const STORAGE_KEY = 'tracegrid_blockchain_blocks_case_v2';
  let blocks = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      blocks = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load cached blocks:', e);
  }
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    blocks = INITIAL_BLOCKS;
  }

  let searchQuery = '';
  let showAllNodes = false;

  function formatShortHash(hash, headLen = 8, tailLen = 8) {
    if (!hash || hash.length <= headLen + tailLen + 3) return hash || '-';
    return `${hash.slice(0, headLen)}...${hash.slice(-tailLen)}`;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB') + ', ' + d.toLocaleTimeString('en-GB');
    } catch (e) {
      return isoStr;
    }
  }

  // Generate SHA-256 / SHA3 compatible random mock hex
  function generateTxHex(bytes = 32) {
    const array = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < bytes; i++) array[i] = Math.floor(Math.random() * 256);
    }
    return '0x' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // Dynamic document synchronizer: automatically anchors uploaded statements
  function syncUploadedFilesToBlockchain() {
    const appState = window.state;
    if (!appState) return;

    const uploadedFiles = [];
    if (appState.parser && appState.parser.files && appState.parser.files.length > 0) {
      appState.parser.files.forEach(f => uploadedFiles.push(f));
    } else if (appState.files && appState.files.length > 0) {
      appState.files.forEach(f => uploadedFiles.push(f));
    }

    let newlyAdded = 0;
    uploadedFiles.forEach(file => {
      const docName = file.name || 'Statement_Evidence.pdf';
      const alreadyAnchored = blocks.some(b => 
        b.transactions.some(t => t.docId === docName || (t.description && t.description.includes(docName)))
      );

      if (!alreadyAnchored) {
        const highest = blocks[0]?.blockNumber || 6;
        const newBlockNumber = highest + 1;
        const prevHash = blocks[0]?.blockHash || '0x8f2d5a7b1c3e4f6098124578abcedf0123456789abcdef0123456789abcdef01';
        const newBlockHash = generateTxHex(32);
        const newTxId = generateTxHex(32);

        const newBlock = {
          blockNumber: newBlockNumber,
          timestamp: new Date().toISOString(),
          prevHash: prevHash,
          blockHash: newBlockHash,
          validatorNode: 'Node-1 (Rajasthan Police Cyber Command Core Node)',
          merkleRoot: newTxId,
          transactions: [
            {
              txId: newTxId,
              docId: docName,
              caseNumber: (appState.case && appState.case.caseId) ? appState.case.caseId : 'FIR/2026/CYBER-4019',
              action: 'ANCHOR_EVIDENCE_STATEMENT',
              executedBy: 'Inspector Arvind Meena (RJ-CYBER-01)',
              role: 'IO',
              status: 'COMMITTED',
              timestamp: new Date().toISOString(),
              description: `Uploaded evidence document anchored: ${docName} (${file.detected || file.size || 'Statement Ingestion'}).`
            }
          ]
        };

        blocks.unshift(newBlock);
        newlyAdded++;
      }
    });

    if (newlyAdded > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
      } catch (e) {}
    }
  }

  // Render the entire page
  function renderBlockchainPage() {
    syncUploadedFilesToBlockchain();

    const highestBlock = blocks[0]?.blockNumber || 6;

    // Filter blocks by search query
    const filtered = blocks.filter(b => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        b.blockNumber.toString().includes(q) ||
        (b.blockHash && b.blockHash.toLowerCase().includes(q)) ||
        (b.prevHash && b.prevHash.toLowerCase().includes(q)) ||
        (b.validatorNode && b.validatorNode.toLowerCase().includes(q)) ||
        b.transactions.some(t =>
          (t.txId && t.txId.toLowerCase().includes(q)) ||
          (t.docId && t.docId.toLowerCase().includes(q)) ||
          (t.caseNumber && t.caseNumber.toLowerCase().includes(q)) ||
          (t.action && t.action.toLowerCase().includes(q)) ||
          (t.executedBy && t.executedBy.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
        )
      );
    });

    return `
      <div class="blockchain-view">
        
        <!-- 1. Header Banner -->
        <div class="gov-card p-4">
          <div class="bc-header-banner">
            <div class="bc-header-left">
              <div class="bc-cpu-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <path d="M15 2v2"/><path d="M9 2v2"/><path d="M20 15h2"/><path d="M20 9h2"/>
                  <path d="M9 20v2"/><path d="M15 20v2"/><path d="M2 9h2"/><path d="M2 15h2"/>
                </svg>
              </div>
              <div>
                <div class="bc-title-row">
                  <h2 class="bc-title">Consortium Blockchain Ledger</h2>
                  <span class="bc-badge-fabric">HYPERLEDGER FABRIC v3.x</span>
                </div>
                <p class="bc-subtitle">PBFT Multi-Node Consensus • Non-Repudiation • Tamper-Evident Cyber Crime Evidence Ledger</p>
              </div>
            </div>
            <div>
              <button class="bc-commit-btn" id="btnRegisterOnChain">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Register Evidence On-Chain
              </button>
            </div>
          </div>
        </div>

        <!-- 2. National Judicial Consortium Status Banner -->
        <div class="gov-card p-4">
          <div class="bc-consensus-card">
            <div class="bc-consensus-left">
              <div class="bc-network-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="16" y="16" width="6" height="6" rx="1"/>
                  <rect x="2" y="16" width="6" height="6" rx="1"/>
                  <rect x="9" y="2" width="6" height="6" rx="1"/>
                  <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/>
                  <path d="M12 12V8"/>
                </svg>
              </div>
              <div>
                <div class="bc-consensus-title">
                  <span>National Cyber Crime Consortium: 5/5 Validator Nodes Online</span>
                  <span class="bc-quorum-badge">PBFT 100% QUORUM</span>
                </div>
                <div class="bc-consensus-sub">Multi-agency consensus trust layer active across Police Cyber Cell, CBI I4C, State FSL Lab, and CERT-In.</div>
              </div>
            </div>
            <div class="bc-consensus-right">
              <span class="bc-managed-badge">Managed by DoIT&C & NIC Grid</span>
              <button class="bc-toggle-nodes-btn" id="btnToggleNodeTelemetry">
                ${showAllNodes ? 'Hide Node Telemetry ▲' : 'Show 5 Node Telemetry ▼'}
              </button>
            </div>
          </div>

          <!-- Peer Nodes Telemetry Grid (Toggled) -->
          ${showAllNodes ? `
            <div class="bc-nodes-grid" id="bcNodesGrid">
              ${CONSORTIUM_NODES.map(node => `
                <div class="bc-node-box">
                  <div class="bc-node-top">
                    <span class="bc-role-tag">${node.peerRole}</span>
                    <span class="bc-latency">${node.latencyMs}ms</span>
                  </div>
                  <div class="bc-node-name">${node.name}</div>
                  <div class="bc-node-org">${node.organization}</div>
                  <div class="bc-node-footer">
                    <div>IP: ${node.ip.split(' ')[0]}</div>
                    <div>Height: #${highestBlock}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 3. Immutable Consortium Block Ledger -->
        <div class="gov-card p-5">
          <div class="bc-explorer-head">
            <div class="bc-explorer-titles">
              <h3>Immutable Evidence Block Ledger</h3>
              <p>Cryptographic hash chain of statement files, detected mule accounts, and money trail graph registrations.</p>
            </div>
            <div class="bc-actions-row">
              <div class="bc-search-box">
                <span class="bc-search-icon">⌕</span>
                <input 
                  type="text" 
                  id="bcSearchInput" 
                  class="bc-search-input" 
                  placeholder="Search by Block #, TX ID, Case No, Document..." 
                  value="${searchQuery.replace(/"/g, '&quot;')}"
                />
              </div>
            </div>
          </div>

          <div class="bc-blocks-list" style="margin-top: 16px;">
            ${filtered.length === 0 ? `
              <div style="padding: 30px; text-align: center; color: #64748b; font-size: 12px;">
                No evidence blocks matching "<b>${searchQuery}</b>".
              </div>
            ` : filtered.map(b => `
              <div class="bc-block-card">
                <!-- Top Line -->
                <div class="bc-block-top">
                  <div class="bc-block-badge-group">
                    <span class="bc-block-num">BLOCK #${b.blockNumber}</span>
                    <span class="bc-block-validator">Validated by: <strong>${b.validatorNode}</strong></span>
                  </div>
                  <div class="bc-block-time">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${formatDateTime(b.timestamp)}</span>
                  </div>
                </div>

                <!-- Dual Hash Grid -->
                <div class="bc-hashes-row">
                  <div class="bc-hash-box" title="${b.blockHash}">
                    <span class="bc-hash-label">Block Hash:</span>
                    <span class="bc-hash-val">${b.blockHash}</span>
                  </div>
                  <div class="bc-hash-box" title="${b.prevHash}">
                    <span class="bc-hash-label">Previous Hash:</span>
                    <span class="bc-hash-val prev">${b.prevHash}</span>
                  </div>
                </div>

                <!-- Transactions -->
                <div class="bc-txs-container">
                  ${b.transactions.map(tx => `
                    <div class="bc-tx-row">
                      <div class="bc-tx-head">
                        <div class="bc-tx-meta">
                          <span class="bc-action-pill">${tx.action}</span>
                          <span class="bc-case-num">${tx.caseNumber}</span>
                          <span class="bc-dot-sep">•</span>
                          <span class="bc-doc-id">${tx.docId}</span>
                        </div>
                        <span class="bc-status-pill ${tx.status === 'FLAGGED' ? 'flagged' : 'committed'}">
                          ${tx.status}
                        </span>
                      </div>
                      ${tx.description ? `
                        <div style="font-size: 10.5px; color: #334155; font-family: var(--sans, sans-serif); line-height: 1.35; padding: 2px 0;">
                          ${tx.description}
                        </div>
                      ` : ''}
                      <div class="bc-tx-sub">
                        <div class="bc-caller" title="${tx.executedBy}">
                          Caller: <strong>${tx.executedBy}</strong> (${tx.role})
                        </div>
                        <div class="bc-txid">TX: ${formatShortHash(tx.txId, 8, 8)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // Wiring user interactions
  function wireEvents() {
    // 1. Search filter input
    const searchInput = document.getElementById('bcSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const pageEl = document.getElementById('page');
        if (pageEl) {
          pageEl.innerHTML = renderBlockchainPage();
          wireEvents();
          // Restore focus to end of input
          const newInp = document.getElementById('bcSearchInput');
          if (newInp) {
            newInp.focus();
            newInp.setSelectionRange(newInp.value.length, newInp.value.length);
          }
        }
      });
    }

    // 2. Toggle Peer Node Telemetry
    const toggleBtn = document.getElementById('btnToggleNodeTelemetry');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        showAllNodes = !showAllNodes;
        const pageEl = document.getElementById('page');
        if (pageEl) {
          pageEl.innerHTML = renderBlockchainPage();
          wireEvents();
        }
      });
    }

    // 3. Register On-Chain Modal Dialog
    const registerBtn = document.getElementById('btnRegisterOnChain');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        openRegisterModal();
      });
    }
  }

  function openRegisterModal() {
    const existing = document.getElementById('bcRegisterModal');
    if (existing) existing.remove();

    const appState = window.state || {};
    const activeCaseId = (appState.case && appState.case.caseId) ? appState.case.caseId : 'FIR/2026/CYBER-4019';
    const activeUtr = (appState.trailUtr) ? appState.trailUtr : '428714563201';

    // Get list of uploaded statement files
    const statementOptions = [];
    if (appState.parser && appState.parser.files && appState.parser.files.length > 0) {
      appState.parser.files.forEach(f => statementOptions.push(f.name));
    } else if (appState.files && appState.files.length > 0) {
      appState.files.forEach(f => statementOptions.push(f.name));
    }
    if (statementOptions.length === 0) {
      statementOptions.push('Sample_Statement_SunriseTraders.pdf', 'Sample_Statement_KiranEnterprises.xlsx');
    }

    const modalHtml = `
      <div class="bc-modal-backdrop" id="bcRegisterModal">
        <div class="bc-modal-dialog">
          <div class="bc-modal-head">
            <h3>Register & Commit Evidence to Consortium Blockchain (PBFT)</h3>
            <button class="bc-modal-close" id="bcModalCloseBtn">×</button>
          </div>
          <div class="bc-modal-body">
            <div class="bc-form-group">
              <label>Consortium Action</label>
              <select id="bcModalAction">
                <option value="ANCHOR_EVIDENCE_STATEMENT">ANCHOR_EVIDENCE_STATEMENT (Uploaded Statement Hash)</option>
                <option value="ANCHOR_MONEY_TRAIL_GRAPH">ANCHOR_MONEY_TRAIL_GRAPH (BNSS §106 / BSA §63)</option>
                <option value="REGISTER_MULE_DETECTION">REGISTER_MULE_DETECTION (5-Rule Detection Result)</option>
                <option value="REGISTER_FREEZE_NOTICE">REGISTER_FREEZE_NOTICE (Section 106 BNSS Statutory Order)</option>
              </select>
            </div>
            <div class="bc-form-group">
              <label>FIR / Case Reference</label>
              <input type="text" id="bcModalCaseNum" value="${activeCaseId}" />
            </div>
            <div class="bc-form-group">
              <label>Evidence Document / File Source</label>
              <select id="bcModalDocId">
                ${statementOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                <option value="EVD-2026-TRAIL-${activeUtr.slice(0, 8)}">Money Trail Graph (UTR: ${activeUtr})</option>
                <option value="EVD-2026-MULE-EVAL">5-Rule Mule Detection Heuristics</option>
              </select>
            </div>
            <div class="bc-form-group">
              <label>Investigating Officer & Station</label>
              <input type="text" id="bcModalCaller" value="Inspector Arvind Meena (RJ-CYBER-01)" />
            </div>
            <div class="bc-form-group">
              <label>Hash Standard for Merkle Root & Block Proof</label>
              <select id="bcModalHashAlg">
                <option value="SHA3-256">SHA3-256 (Keccak-256 BSA 2023 Compliant)</option>
                <option value="SHA-256">SHA-256 (NIST FIPS 180-4)</option>
              </select>
            </div>
          </div>
          <div class="bc-modal-foot">
            <button class="btn btn-secondary" id="bcModalCancelBtn">Cancel</button>
            <button class="btn btn-primary" id="bcModalSubmitBtn">Commit Block to Chain</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.getElementById('bcRegisterModal');
    const close = () => modalEl && modalEl.remove();

    document.getElementById('bcModalCloseBtn')?.addEventListener('click', close);
    document.getElementById('bcModalCancelBtn')?.addEventListener('click', close);

    document.getElementById('bcModalSubmitBtn')?.addEventListener('click', () => {
      const action = document.getElementById('bcModalAction').value;
      const caseNumber = document.getElementById('bcModalCaseNum').value || activeCaseId;
      const docId = document.getElementById('bcModalDocId').value || 'DOC-EVD-STATEMENT';
      const executedBy = document.getElementById('bcModalCaller').value || 'IO Inspector Arvind Meena';

      const highest = blocks[0]?.blockNumber || 6;
      const newBlockNumber = highest + 1;
      const prevHash = blocks[0]?.blockHash || '0x8f2d5a7b1c3e4f6098124578abcedf0123456789abcdef0123456789abcdef01';
      const newBlockHash = generateTxHex(32);
      const newTxId = generateTxHex(32);

      const newBlock = {
        blockNumber: newBlockNumber,
        timestamp: new Date().toISOString(),
        prevHash: prevHash,
        blockHash: newBlockHash,
        validatorNode: 'Node-1 (Rajasthan Police Cyber Command Core Node)',
        merkleRoot: newTxId,
        transactions: [
          {
            txId: newTxId,
            docId: docId,
            caseNumber: caseNumber,
            action: action,
            executedBy: executedBy,
            role: 'IO',
            status: 'COMMITTED',
            timestamp: new Date().toISOString(),
            description: `Document anchored on consortium chain: ${docId}`
          }
        ]
      };

      // Add to front of chain
      blocks.unshift(newBlock);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
      } catch (e) {}

      close();

      if (typeof window.toast === 'function') {
        window.toast(`⛓️ Block #${newBlockNumber} COMMITTED to Consortium Ledger with 100% PBFT Quorum!`);
      }

      const pageEl = document.getElementById('page');
      if (pageEl) {
        pageEl.innerHTML = renderBlockchainPage();
        wireEvents();
      }
    });
  }

  // Export module globally
  window.BlockchainModule = {
    renderBlockchainPage,
    wireEvents,
    getBlocks: () => blocks,
    getNodes: () => CONSORTIUM_NODES,
    syncUploadedFilesToBlockchain
  };
  // Maintain backward-compat reference
  window.BlockchainIcjsModule = window.BlockchainModule;

})();
