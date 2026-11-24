/**
 * TraceGrid Legal Requisitions & Statutory Notice Studio
 * Conforming to Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 & Information Technology Act, 2000
 * Exposes window.LegalDraftModule
 */

(function() {
  'use strict';

  // --- Statutory Templates Metadata ---
  const TEMPLATES = [
    {
      id: 'BANK_FREEZE',
      title: 'Bank Account Debit Freeze Order',
      statute: 'Section 106 BNSS 2023',
      formerStatute: 'Sec 102 CrPC',
      deadline: '2 Hours (Golden Window)',
      deadlineHours: 2,
      category: 'Bank / Intermediary',
      urgent: true,
      description: 'Statutory debit freeze & lien marking to preserve illicit proceeds from subsequent mule dissipation.'
    },
    {
      id: 'BANK_KYC',
      title: 'KYC Dossier & IP Login Audit Summons',
      statute: 'Section 94 BNSS 2023',
      formerStatute: 'Sec 91 CrPC',
      deadline: '48 Hours',
      deadlineHours: 48,
      category: 'Bank / Intermediary',
      urgent: false,
      description: 'Requisition of certified AOF, identity cards, device telemetry, and timestamped IPv4/IPv6 login audit trail.'
    },
    {
      id: 'REGISTRAR_NOTICE',
      title: 'Domain & Host Preservation / Takedown Notice',
      statute: 'Section 94 BNSS & Sec 79(3)(b) IT Act',
      formerStatute: 'Sec 91 CrPC & Sec 79(3)(b) IT Act',
      deadline: '24 Hours',
      deadlineHours: 24,
      category: 'Registrar / Host / CDN',
      urgent: true,
      description: 'Emergency Whois unmasking, 180-day server access log preservation, and malicious DNS suspension.'
    },
    {
      id: 'TELECOM_CDR',
      title: 'Telecom CDR & SDR Requisition Notice',
      statute: 'Section 94 BNSS 2023',
      formerStatute: 'Sec 91 CrPC',
      deadline: '48 Hours',
      deadlineHours: 48,
      category: 'Telecom Service Provider',
      urgent: false,
      description: 'Requisition for Subscriber Detail Record (SDR), tower location CDR, handset IMEI history, and GPRS NAT logs.'
    }
  ];

  // --- Active Module State ---
  const state = {
    currentTemplate: 'BANK_FREEZE',
    currentEntity: {},
    noticeSubject: '',
    noticeBody: '',
    recipientEmail: '',
    referenceNo: '',
    isModalOpen: false
  };

  // --- Helper: Format INR ---
  function formatMoneyINR(val) {
    let num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(/[^\d.-]/g, ''));
    if (isNaN(num)) num = 0;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  // --- Helper: Amount in Indian English Words ---
  function amountToWordsINR(amount) {
    let val = Math.floor(Math.abs(parseFloat(String(amount || 0).replace(/[^\d.-]/g, '')) || 0));
    if (val === 0) return 'Rupees Zero Only';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                   'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                   'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertUpto999(n) {
      let parts = [];
      if (n >= 100) {
        parts.push(units[Math.floor(n / 100)] + ' Hundred');
        n %= 100;
      }
      if (n >= 20) {
        parts.push(tens[Math.floor(n / 10)]);
        n %= 10;
      }
      if (n > 0) {
        parts.push(units[n]);
      }
      return parts.join(' ').trim();
    }

    let crore = Math.floor(val / 10000000);
    val %= 10000000;
    let lakh = Math.floor(val / 100000);
    val %= 100000;
    let thousand = Math.floor(val / 1000);
    val %= 1000;
    let hundreds = val;

    let res = [];
    if (crore) res.push(convertUpto999(crore) + ' Crore');
    if (lakh) res.push(convertUpto999(lakh) + ' Lakh');
    if (thousand) res.push(convertUpto999(thousand) + ' Thousand');
    if (hundreds) res.push(convertUpto999(hundreds));

    return 'Rupees ' + res.join(' ').trim() + ' Only';
  }

  // --- Helper: Extract Global Context from App ---
  function getCaseContext() {
    let globalCase = window.state?.case || {};
    return {
      police_station: 'Cyber Crime Police Station, Jaipur Range, Rajasthan',
      state_dept: 'Rajasthan Police - Cyber Crime Branch',
      case_id: globalCase.caseId || 'CR-2026-OCT-4287',
      fir_no: `FIR No. ${String(globalCase.caseId || '4287').replace(/\D/g, '').slice(-4) || '4287'}/2026`,
      fir_date: globalCase.complaintDate ? globalCase.complaintDate.slice(0, 10) : '18-Oct-2026',
      bns_sections: 'u/s 318(4), 319(2), 336(3), 338, 340(2) BNS 2023 & Sec 66C, 66D IT Act 2000',
      io_name: window.state?.userName || 'Inspector Rajesh Sharma',
      io_designation: 'Station House Officer / Investigating Officer (Cyber)',
      io_phone: '+91-141-2740000',
      io_email: 'sho.cyber.jaipur@rajasthan.gov.in',
      victim_name: globalCase.victimName || 'Meera Nair',
      victim_account: globalCase.victimAccount || 'ACC-VIC-4287',
      amount: globalCase.amount || 485000,
      utr: globalCase.utr || '428714563201',
      tx_date: globalCase.txDate ? globalCase.txDate.replace('T', ' ') + ' IST' : '2026-10-18 10:42 IST',
      bank_name: 'HDFC Bank',
      branch: 'Jaipur Main Branch',
      account_no: '50100234567801',
      ifsc: 'HDFC0001234',
      holder_name: 'SUNRISE TRADERS',
      domain: 'secure-payee-demo.test',
      ip: '198.51.100.24',
      ns: 'ns1.sample-ns.test',
      abuse_contact: 'abuse-compliance@sample-registrar.test',
      mobile_no: '+91-9876543210',
      telecom_provider: 'Bharti Airtel Ltd.'
    };
  }

  // --- Client-Side Notice Draft Engine (Offline Fallback & Realtime Sync) ---
  function compileNoticeDraft(templateType, entityOverrides) {
    const ctx = Object.assign({}, getCaseContext(), entityOverrides || {});
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const caseSuffix = String(ctx.case_id || '4287').slice(-4);
    const amountFmt = formatMoneyINR(ctx.amount);
    const amountWords = amountToWordsINR(ctx.amount);

    let subject = '';
    let body = '';
    let recipientEmail = 'nodal.cyber@bank-portal.test';
    let refNo = `CCPS/JPR/${new Date().getFullYear()}/NOT-${caseSuffix}`;

    if (templateType === 'BANK_FREEZE') {
      refNo = `CCPS/JPR/${new Date().getFullYear()}/FRZ-${caseSuffix}`;
      subject = `URGENT: STATUTORY NOTICE U/S 106 BNSS 2023 FOR IMMEDIATE DEBIT FREEZE ON SUSPECT ACCOUNT NO. ${ctx.account_no} | REF: ${ctx.fir_no}`;
      recipientEmail = `cybercell.nodal@${String(ctx.bank_name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'hdfc'}.bank.test`;
      body = `OFFICE OF THE SUPERINTENDENT OF POLICE
CYBER CRIME POLICE STATION, JAIPUR RANGE
${ctx.police_station.toUpperCase()}
Email: ${ctx.io_email} | Helpline: 1930 / ${ctx.io_phone}
----------------------------------------------------------------------------------------------------
DISPATCH REF NO: ${refNo}                                        DATED: ${dateStr}

MOST URGENT // CYBER FRAUD PROCEEDS RECOVERY // TIME SENSITIVE (2-HOUR WINDOW)

To,
The Nodal Cyber Crime Officer / Branch Manager,
${ctx.bank_name},
Branch: ${ctx.branch}, IFSC: ${ctx.ifsc}.

SUB: STATUTORY ORDER UNDER SECTION 106 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023
     (FORMERLY SECTION 102 OF CODE OF CRIMINAL PROCEDURE, 1973) FOR IMMEDIATE DEBIT FREEZE / 
     LIEN MARKING ON ACCOUNT NO: ${ctx.account_no}.

REF: 1. Case FIR No: ${ctx.fir_no} dated ${ctx.fir_date}
     2. Offences Registered: ${ctx.bns_sections}
     3. National Cyber Crime Reporting Portal (NCRP) Acknowledgement: ${ctx.case_id}
     4. Disputed Transaction UTR: ${ctx.utr}

Sir / Madam,

1. WHEREAS, an investigation into a sophisticated digital financial fraud is underway at this Police Station pursuant to a formal complaint lodged by victim ${ctx.victim_name}, wherein an amount of ${amountFmt} (${amountWords}) was fraudulently siphoned off from the victim's account (${ctx.victim_account}) on ${ctx.tx_date} under Transaction UTR ${ctx.utr}.

2. AND WHEREAS, digital forensic analysis and Money Trail hop-by-hop tracking have established that the stolen proceeds of crime were routed directly or through immediate layering into the following suspect account maintained at your bank:

   • Beneficiary Account Name   : ${ctx.holder_name}
   • Beneficiary Account Number : ${ctx.account_no}
   • Bank Name & Branch         : ${ctx.bank_name} (${ctx.branch})
   • IFSC Code                  : ${ctx.ifsc}
   • Siphoned Amount Credited   : ${amountFmt} (${amountWords})
   • Associated Transaction UTR : ${ctx.utr}

3. NOW THEREFORE, by virtue of statutory powers vested in me under SECTION 106 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023, you are HEREBY DIRECTED TO:
   
   a) Immediately execute an absolute DEBIT FREEZE / LIEN to the extent of ${amountFmt} (or the entire available balance if less) on Account No. ${ctx.account_no}, preventing any outward withdrawal, ATM withdrawal, UPI, IMPS, RTGS, NEFT, cheque clearance, or net-banking debit.
   
   b) Transmit a written confirmation of compliance along with the EXACT RETAINED/FREEZED BALANCE to this Cyber Crime Police Station via reply email (${ctx.io_email}) WITHIN TWO (2) HOURS of the receipt of this statutory notice.
   
   c) Furnish a certified statement of account for the subject account from date of inception to till date in password-free PDF and CSV formats.
   
   d) If any portion of the stolen funds has already been layered into secondary accounts, immediately provide the downstream beneficiary account details, IFSC, and outbound transaction UTRs to enable onward rapid preservation.

4. MANDATORY STATUTORY WARNING:
   Take note that non-compliance with or undue delay in executing this statutory freeze order will attract criminal prosecution under Section 223 (Disobedience to order duly promulgated by public servant) and Section 228 (Omission to produce document or deliver up thing to public servant) of the Bharatiya Nyaya Sanhita (BNS), 2023, along with reporting to the Reserve Bank of India (RBI) Regulatory Oversight Cell.

5. A certificate under SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM (BSA), 2023 (formerly Section 65B of Indian Evidence Act) verifying the authenticity of all electronic account logs and statements must accompany your official compliance report.

Issued under my hand and seal of office on this ${dateStr}.

Investigating Officer:
${ctx.io_name}
${ctx.io_designation}
${ctx.police_station}
Contact: ${ctx.io_phone} | Official Email: ${ctx.io_email}`;
    }
    else if (templateType === 'BANK_KYC') {
      refNo = `CCPS/JPR/${new Date().getFullYear()}/SUM-${caseSuffix}`;
      subject = `STATUTORY SUMMONS U/S 94 BNSS 2023 FOR PRODUCTION OF KYC DOSSIER & NET-BANKING IP LOGIN AUDIT LOGS | ACC NO: ${ctx.account_no} (${ctx.bank_name})`;
      recipientEmail = `cybercell.nodal@${String(ctx.bank_name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'bank'}.bank.test`;
      body = `OFFICE OF THE INVESTIGATING OFFICER
CYBER CRIME POLICE STATION, JAIPUR RANGE
${ctx.police_station.toUpperCase()}
Email: ${ctx.io_email} | Phone: ${ctx.io_phone}
----------------------------------------------------------------------------------------------------
DISPATCH REF NO: ${refNo}                                        DATED: ${dateStr}

REQUISITION FOR PRODUCTION OF ELECTRONIC EVIDENCE // STRICT 48-HOUR TIMELINE

To,
The Nodal Officer (Law Enforcement / Cyber Crime Cell),
${ctx.bank_name},
Branch: ${ctx.branch}, IFSC: ${ctx.ifsc}.

SUB: SUMMONS UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023
     (FORMERLY SECTION 91 OF CODE OF CRIMINAL PROCEDURE, 1973) FOR PRODUCTION OF CERTIFIED 
     KYC DOCUMENTS AND IP LOGIN AUDIT LOGS RELATING TO ACCOUNT NO: ${ctx.account_no}.

REF: Case FIR No: ${ctx.fir_no} | Case ID: ${ctx.case_id}
     Sections of Law: ${ctx.bns_sections}
     Suspect Account: ${ctx.account_no} (${ctx.holder_name})

Sir / Madam,

1. WHEREAS, the above-referenced cyber crime case is being investigated by the undersigned officer under Chapter XIII of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, regarding systematic cyber financial deception, unauthorized computer access, and illicit layering of criminal proceeds.

2. AND WHEREAS, during the forensic inquiry, Account No. ${ctx.account_no} titled in the name of '${ctx.holder_name}' maintained at your ${ctx.branch} branch (IFSC: ${ctx.ifsc}) has surfaced as an operational mule account used for receiving and dissipating proceeds of crime.

3. NOW THEREFORE, by virtue of the powers conferred upon me under SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023, you are HEREBY SUMMONED AND DIRECTED to produce before the undersigned, via secure electronic transmission to ${ctx.io_email}, within FORTY-EIGHT (48) HOURS of the receipt of this notice, the following certified records:

   I. COMPLETE KYC & ACCOUNT OPENING DOSSIER:
      a) Certified copy of Account Opening Form (AOF) with customer signature card.
      b) Clear copy of Proof of Identity (POI) and Proof of Address (POA) submitted at account opening (e.g., Aadhaar Card, PAN Card, Passport, Voter ID).
      c) Registered mobile number, registered email address, and history of any change of mobile number or email ID since inception.
      d) In-person verification (IPV) / Video-KYC (V-KYC) recording and geo-coordinates captured during KYC onboarding.

   II. INTERNET BANKING & MOBILE APP IP LOGIN AUDIT TRAIL:
      a) Complete date-and-time stamped login logs (in UTC and IST) for all Net-Banking and Mobile Banking sessions from ${ctx.tx_date} to till date.
      b) Source IPv4 / IPv6 addresses, destination IP, and source port numbers for every transaction and login event.
      c) Device telemetry: Device Make, Model, Operating System version, IMEI, MAC address, and Mobile App Device Fingerprint.

   III. DETAILED FINANCIAL LEDGER & COUNTERPARTIES:
      a) Certified statement of accounts in Microsoft Excel (.xlsx) or CSV format from 01-Jan-2026 to date.
      b) Complete remittance/beneficiary details for all inward UPI, IMPS, RTGS, and NEFT credits exceeding ₹10,000, including sender name, remitter account number, sender bank, and RRN/UTR.

4. CERTIFICATION UNDER SECTION 63 BSA 2023:
   As required under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA), all digital printouts and electronic records must be accompanied by a statutory certificate signed by the Systems Administrator or Authorized Signatory of the bank.

5. NON-COMPLIANCE WARNING:
   Please note that deliberate suppression of evidence or failure to comply with this summons within the stipulated 48 hours will render the responsible officer liable to penal consequences under Section 228 of the Bharatiya Nyaya Sanhita, 2023.

Given under my hand and official seal.

${ctx.io_name}
${ctx.io_designation}
${ctx.police_station}
Email: ${ctx.io_email} | Office: ${ctx.io_phone}`;
    }
    else if (templateType === 'REGISTRAR_NOTICE') {
      refNo = `CCPS/JPR/${new Date().getFullYear()}/REG-${caseSuffix}`;
      subject = `EMERGENCY PRESERVATION & TAKEDOWN NOTICE U/S 94 BNSS 2023 R/W SEC 79(3)(b) IT ACT | DOMAIN: ${ctx.domain} / IP: ${ctx.ip}`;
      recipientEmail = ctx.abuse_contact || 'abuse@domain-registrar.test';
      body = `OFFICE OF THE SUPERINTENDENT OF POLICE
CYBER CRIME POLICE STATION, JAIPUR RANGE
${ctx.police_station.toUpperCase()}
Email: ${ctx.io_email} | Incident Helpline: 1930 / ${ctx.io_phone}
----------------------------------------------------------------------------------------------------
DISPATCH REF NO: ${refNo}                                        DATED: ${dateStr}

STATUTORY INTERMEDIARY DIRECTIVE // EMERGENCY 24-HOUR ACTION REQUIRED

To,
The Abuse / Legal Compliance Officer & Law Enforcement Liaison,
Registrar / Web Hosting Provider / Cloud Infrastructure: ${ctx.abuse_contact},
Target Domain Name : ${ctx.domain}
Associated Host IP : ${ctx.ip}
Nameservers        : ${ctx.ns}

SUB: NOTICE UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023 READ WITH 
     SECTION 79(3)(b) & SECTION 69A OF THE INFORMATION TECHNOLOGY ACT, 2000 FOR EMERGENCY 
     PRESERVATION OF ELECTRONIC EVIDENCE AND SUSPENSION / TAKEDOWN OF PHISHING INFRASTRUCTURE.

REF: Case FIR No: ${ctx.fir_no} registered under:
     ${ctx.bns_sections}
     Target Malicious Infrastructure: ${ctx.domain} (Resolving to IP: ${ctx.ip})

Sir / Madam,

1. NOTICE IS HEREBY GIVEN that the Cyber Crime Police Station, Jaipur Range is investigating an organized interstate cyber fraud racket. Forensic analysis of phishing campaigns, malicious link distribution, and cyber infrastructure has revealed that the domain:
   
   DOMAIN NAME       : ${ctx.domain}
   RESOLVED IP       : ${ctx.ip}
   AUTHORITATIVE NS  : ${ctx.ns}
   
   has been weaponized to impersonate legitimate payment gateways, banking portals, and government utilities to harvest victims' banking credentials, OTPs, and private keys, thereby orchestrating unauthorized fund transfers.

2. STATUTORY DIRECTIVES UNDER BNSS 2023 & IT ACT 2000:
   In accordance with powers under Section 94 BNSS 2023 and the statutory duty of intermediaries under Section 79(3)(b) of the Information Technology Act, 2000 (Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021), you are HEREBY DIRECTED TO EXECUTE THE FOLLOWING WITHIN TWENTY-FOUR (24) HOURS:

   A. EMERGENCY PRESERVATION OF ELECTRONIC LOGS (180 DAYS):
      Immediately preserve and archive all digital records relating to the subject domain and hosting server, including web server access logs, error logs, FTP logs, SSH login logs, database snapshots, and DNS zone configurations, with timestamp and source IP/port mapping, for a mandatory minimum period of 180 days.

   B. DISCLOSURE OF REGISTRANT & SUBSCRIBER IDENTITY (UNMASK WHOIS PRIVACY):
      Produce the complete unmasked Whois and billing dossier of the subscriber/account holder who registered or leased ${ctx.domain} or IP ${ctx.ip}, specifically:
      • Full Registrant Name, physical billing address, contact phone numbers, and email IDs.
      • Mode of payment (Credit/Debit Card last 4 digits, PayPal ID, Bank Account, or Cryptocurrency Wallet TX hash / wallet address).
      • Source IP address and timestamp recorded at the time of domain registration and DNS modification.

   C. IMMEDIATE MITIGATION / DNS SINKHOLING:
      Immediately suspend domain resolution (ClientHold / ServerHold) or redirect DNS traffic to a law enforcement landing page to protect public citizens from active credential theft.

3. LEGAL OBLIGATION:
   Under Section 79(3)(b) of the IT Act, 2000, upon receiving actual knowledge by an order or notification issued by the appropriate Government or its agency, the intermediary is mandated to expeditiously remove or disable access to the unlawful material. Failure to do so will result in forfeiture of intermediary safe harbor protection under Section 79(1) of the IT Act, exposing the entity to vicarious liability and abetment charges under the Bharatiya Nyaya Sanhita, 2023.

4. Furnish the preserved records accompanied by a Section 63 Bharatiya Sakshya Adhiniyam, 2023 Certificate via encrypted email to ${ctx.io_email}.

Issued by:
${ctx.io_name}
${ctx.io_designation}
${ctx.police_station}
Contact: ${ctx.io_phone} | Email: ${ctx.io_email}`;
    }
    else if (templateType === 'TELECOM_CDR') {
      refNo = `CCPS/JPR/${new Date().getFullYear()}/TEL-${caseSuffix}`;
      subject = `STATUTORY NOTICE U/S 94 BNSS 2023 FOR PRODUCTION OF SDR & CDR WITH CELL TOWER LOCATION | MOBILE NO: ${ctx.mobile_no} (${ctx.telecom_provider})`;
      recipientEmail = `lea.nodal@${String(ctx.telecom_provider).toLowerCase().replace(/[^a-z0-9]/g, '') || 'telecom'}.telecom.test`;
      body = `OFFICE OF THE SUPERINTENDENT OF POLICE
CYBER CRIME POLICE STATION, JAIPUR RANGE
${ctx.police_station.toUpperCase()}
Email: ${ctx.io_email} | Emergency Phone: ${ctx.io_phone}
----------------------------------------------------------------------------------------------------
DISPATCH REF NO: ${refNo}                                        DATED: ${dateStr}

REQUISITION FOR TELECOMMUNICATION SUBSCRIBER EVIDENCE // 48-HOUR STATUTORY TIMELINE

To,
The Nodal Officer (Law Enforcement / Cyber Cell),
${ctx.telecom_provider},
Rajasthan Telecom Circle / Concerned Nodal Center.

SUB: STATUTORY REQUISITION NOTICE UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 
     2023 (FORMERLY SECTION 91 CrPC) FOR PRODUCTION OF SUBSCRIBER DETAIL RECORD (SDR) AND CALL 
     DETAIL RECORD (CDR) WITH TOWER ID FOR MOBILE NO: ${ctx.mobile_no}.

REF: Case FIR No: ${ctx.fir_no} | Case ID: ${ctx.case_id}
     Sections of Law: ${ctx.bns_sections}
     Target Mobile Number: ${ctx.mobile_no}

Sir / Madam,

1. WHEREAS, the Cyber Crime Police Station is conducting investigation into an organized cyber syndicate engaged in digital fraud, identity spoofing, and extortion. During the analysis of call traffic, OTP reception, and cyber telemetry, the following mobile number has been found directly implicated:

   • Target Mobile Number (MSISDN) : ${ctx.mobile_no}
   • Telecom Service Provider      : ${ctx.telecom_provider}
   • Incident Relevant Time Window : 01-Jan-2026 to till date

2. NOW THEREFORE, by virtue of statutory powers conferred upon me under SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023, you are HEREBY DIRECTED TO FURNISH the following records in password-free electronic format to ${ctx.io_email} WITHIN FORTY-EIGHT (48) HOURS:

   I. SUBSCRIBER DETAIL RECORD (SDR) & CUSTOMER APPLICATION FORM (CAF):
      a) Customer Application Form (CAF) along with uploaded digital Proof of Identity (POI) and Proof of Address (POA).
      b) Live customer photo taken at the time of e-KYC or SIM issuance.
      c) Point of Sale (POS) Agent / Retailer Name, Agent ID, and geographical shop address where the SIM was activated.
      d) Date of original activation, alternate contact mobile number, and local reference address.

   II. CALL DETAIL RECORD (CDR) WITH CELL TOWER LOCATIONS:
      a) Complete CDR (Incoming calls, Outgoing calls, SMS sent/received) for the period ${ctx.tx_date} to date.
      b) Cell ID (First Cell ID and Last Cell ID) for each event, along with Azimuth angle.
      c) Master Cell Tower Dump / Address Chart indicating the physical latitude, longitude, and site address of every Cell ID appearing in the CDR.

   III. HANDSET IMEI PAIRING HISTORY:
      a) List of all IMEI numbers used in conjunction with the target MSISDN during the last 6 months.
      b) List of all other mobile numbers (MSISDNs) used in the same handset IMEIs.

   IV. GPRS / DATA SESSION IP ALLOCATION LOGS:
      a) NAT/CGNAT translation logs showing dynamic IPv4/IPv6 allocated to the MSISDN along with exact source port and destination port mapping for digital banking sessions.

3. MANDATORY SECTION 63 BSA 2023 CERTIFICATE:
   In compliance with Section 63 of the Bharatiya Sakshya Adhiniyam, 2023, you are required to append a signed electronic certificate validating that the telecommunication logs were retrieved from automated logging servers in the ordinary course of business without tampering.

4. FAILURE TO COMPLY WARNING:
   Default in compliance with this lawful requisition without valid cause is punishable under Section 228 of the Bharatiya Nyaya Sanhita (BNS), 2023.

Given under my hand and official seal.

${ctx.io_name}
${ctx.io_designation}
${ctx.police_station}
Contact: ${ctx.io_phone} | Email: ${ctx.io_email}`;
    }

    return {
      templateType,
      subject,
      body: body.trim(),
      recipientEmail,
      referenceNo: refNo,
      context: ctx
    };
  }

  // --- Modal DOM Injection & Management ---
  function ensureModalInDOM() {
    if (document.getElementById('legalRequestModal')) return;

    const modalHtml = `
      <div id="legalRequestModal" class="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="legalModalTitle">
        <div class="legal-modal-window">
          <!-- Header -->
          <div class="legal-modal-header">
            <div class="legal-modal-title-wrap">
              <span class="legal-emblem-badge">⚖️</span>
              <div>
                <h2 id="legalModalTitle">Statutory Legal Requisition & Notice Dispatch Studio</h2>
                <p>Governed by Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 & IT Act, 2000</p>
              </div>
            </div>
            <button class="legal-modal-close" id="legalModalCloseBtn" title="Close (Esc)">✕</button>
          </div>

          <!-- Body -->
          <div class="legal-modal-body">
            <!-- Controls Strip -->
            <div class="legal-controls-strip">
              <div class="legal-field-group">
                <label for="legalTemplateSelect">Statutory Notice Template</label>
                <select id="legalTemplateSelect">
                  ${TEMPLATES.map(t => `
                    <option value="${t.id}">${t.title} [${t.statute}]</option>
                  `).join('')}
                </select>
              </div>
              <div class="legal-field-group">
                <label for="legalRecipientInput">Recipient Nodal Desk</label>
                <input id="legalRecipientInput" placeholder="nodal@bank.test" value="">
              </div>
              <div class="legal-field-group">
                <label>Statutory Deadline</label>
                <div id="legalDeadlineBadge" class="legal-badge-pill legal-badge-urgent" style="height:32px;justify-content:center;">
                  ⏳ 2 Hours
                </div>
              </div>
            </div>

            <!-- Pre-populated Entity Tags -->
            <div class="legal-entity-tags-row" id="legalEntityTagsRow">
              <span style="font-weight:700;color:#475569;">Target Variables:</span>
              <span id="tagAccount" class="legal-entity-tag"><span>Account:</span> <b id="tagAccountVal">-</b></span>
              <span id="tagBank" class="legal-entity-tag"><span>Bank:</span> <b id="tagBankVal">-</b></span>
              <span id="tagAmount" class="legal-entity-tag"><span>Amount:</span> <b id="tagAmountVal">-</b></span>
              <span id="tagUtr" class="legal-entity-tag"><span>UTR:</span> <b id="tagUtrVal">-</b></span>
              <span id="tagDomain" class="legal-entity-tag"><span>Domain:</span> <b id="tagDomainVal">-</b></span>
              <span id="tagIp" class="legal-entity-tag"><span>IP:</span> <b id="tagIpVal">-</b></span>
            </div>

            <!-- Live Editable Notice -->
            <div class="legal-editor-container">
              <div class="legal-editor-toolbar">
                <span id="legalSubjectDisplay" style="font-weight:600;color:#0e2942;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;">
                  Subject: -
                </span>
                <span>Editable Law Enforcement Notice Draft</span>
              </div>
              <textarea id="legalDraftEditor" class="legal-notice-editor" rows="18" spellcheck="false"></textarea>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="legal-modal-footer">
            <div class="legal-footer-left">
              <span id="legalRefDisplay" style="font-size:11px;font-family:monospace;color:#64748b;font-weight:600;">Ref: -</span>
            </div>
            <div class="legal-footer-actions">
              <button class="legal-btn legal-btn-secondary" id="legalDownloadBtn" title="Download as text file">
                💾 Download .txt
              </button>
              <button class="legal-btn legal-btn-secondary" id="legalPrintBtn" title="Print official letterhead">
                🖨️ Print / Save PDF
              </button>
              <button class="legal-btn legal-btn-emerald" id="legalCopyBtn" title="Copy formatted notice to clipboard">
                📋 Copy Notice
              </button>
              <button class="legal-btn legal-btn-primary" id="legalMailtoBtn" title="Open default email client">
                ✉️ Dispatch via Email
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Off-screen Official Police Letterhead Container for Clean PDF Printing -->
      <div id="legalPrintContainer" style="display:none;"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    wireModalEvents();
  }

  function wireModalEvents() {
    const modal = document.getElementById('legalRequestModal');
    const closeBtn = document.getElementById('legalModalCloseBtn');
    const templateSelect = document.getElementById('legalTemplateSelect');
    const copyBtn = document.getElementById('legalCopyBtn');
    const printBtn = document.getElementById('legalPrintBtn');
    const downloadBtn = document.getElementById('legalDownloadBtn');
    const mailtoBtn = document.getElementById('legalMailtoBtn');
    const editor = document.getElementById('legalDraftEditor');
    const recipientInput = document.getElementById('legalRecipientInput');

    if (!modal) return;

    // Close modal on backdrop click or close button
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isModalOpen) {
        closeModal();
      }
    });

    // Template selection change
    templateSelect?.addEventListener('change', (e) => {
      state.currentTemplate = e.target.value;
      refreshModalDraft();
    });

    // Recipient change
    recipientInput?.addEventListener('input', (e) => {
      state.recipientEmail = e.target.value;
    });

    // Editor manual edits
    editor?.addEventListener('input', (e) => {
      state.noticeBody = e.target.value;
    });

    // Copy notice
    copyBtn?.addEventListener('click', () => {
      const textToCopy = editor ? editor.value : state.noticeBody;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('📋 Statutory notice copied to clipboard!');
      }).catch(() => {
        showToast('Error copying notice');
      });
    });

    // Print / PDF
    printBtn?.addEventListener('click', () => {
      printNotice();
    });

    // Download .txt
    downloadBtn?.addEventListener('click', () => {
      downloadNotice();
    });

    // Mailto dispatch
    mailtoBtn?.addEventListener('click', () => {
      dispatchMailto();
    });
  }

  // --- Show Toast Helper ---
  function showToast(msg) {
    if (typeof window.toast === 'function') {
      window.toast(msg);
      return;
    }
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.classList.add('visible');
      setTimeout(() => t.classList.remove('visible'), 3200);
    }
  }

  // --- Modal Open / Close Logic ---
  function openModal(entityContext) {
    ensureModalInDOM();
    const modal = document.getElementById('legalRequestModal');
    if (!modal) return;

    state.currentEntity = Object.assign({}, entityContext || {});

    // Intelligent template defaulting based on entity type
    if (entityContext?.type) {
      state.currentTemplate = entityContext.type;
    } else if (entityContext?.domain) {
      state.currentTemplate = 'REGISTRAR_NOTICE';
    } else if (entityContext?.mobile || entityContext?.mobile_no) {
      state.currentTemplate = 'TELECOM_CDR';
    } else {
      state.currentTemplate = 'BANK_FREEZE';
    }

    const templateSelect = document.getElementById('legalTemplateSelect');
    if (templateSelect) {
      templateSelect.value = state.currentTemplate;
    }

    refreshModalDraft();
    modal.classList.add('open');
    state.isModalOpen = true;
  }

  function closeModal() {
    const modal = document.getElementById('legalRequestModal');
    if (modal) {
      modal.classList.remove('open');
      state.isModalOpen = false;
    }
  }

  function refreshModalDraft() {
    const tMeta = TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0];

    // Normalize entity overrides
    const ent = state.currentEntity || {};
    const overrides = {
      account_no: ent.account || ent.account_no,
      bank_name: ent.bank || ent.bank_name,
      amount: ent.amount,
      utr: ent.utr,
      holder_name: ent.name || ent.holder_name,
      domain: ent.domain,
      ip: ent.ip,
      ns: ent.ns,
      abuse_contact: ent.abuse || ent.abuse_contact,
      mobile_no: ent.mobile || ent.mobile_no,
      telecom_provider: ent.telecom || ent.telecom_provider
    };

    const draft = compileNoticeDraft(state.currentTemplate, overrides);
    state.noticeSubject = draft.subject;
    state.noticeBody = draft.body;
    state.recipientEmail = draft.recipientEmail;
    state.referenceNo = draft.referenceNo;

    // Update Modal DOM
    const editor = document.getElementById('legalDraftEditor');
    const subjectDisplay = document.getElementById('legalSubjectDisplay');
    const recipientInput = document.getElementById('legalRecipientInput');
    const refDisplay = document.getElementById('legalRefDisplay');
    const deadlineBadge = document.getElementById('legalDeadlineBadge');

    if (editor) editor.value = draft.body;
    if (subjectDisplay) subjectDisplay.textContent = draft.subject;
    if (recipientInput) recipientInput.value = draft.recipientEmail;
    if (refDisplay) refDisplay.textContent = `Dispatch Ref: ${draft.referenceNo}`;

    if (deadlineBadge) {
      deadlineBadge.className = `legal-badge-pill ${tMeta.urgent ? 'legal-badge-urgent' : 'legal-badge-statutory'}`;
      deadlineBadge.textContent = `⏳ ${tMeta.deadline}`;
    }

    // Update target variable tags
    const updateTag = (id, val, show) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + 'Val');
      if (el && valEl) {
        if (show && val) {
          el.style.display = 'inline-flex';
          valEl.textContent = val;
        } else {
          el.style.display = 'none';
        }
      }
    };

    const isBank = state.currentTemplate.startsWith('BANK');
    const isDomain = state.currentTemplate === 'REGISTRAR_NOTICE';
    const isTel = state.currentTemplate === 'TELECOM_CDR';

    updateTag('tagAccount', overrides.account_no || draft.context.account_no, isBank);
    updateTag('tagBank', overrides.bank_name || draft.context.bank_name, isBank);
    updateTag('tagAmount', formatMoneyINR(overrides.amount || draft.context.amount), isBank && state.currentTemplate === 'BANK_FREEZE');
    updateTag('tagUtr', overrides.utr || draft.context.utr, isBank);
    updateTag('tagDomain', overrides.domain || draft.context.domain, isDomain);
    updateTag('tagIp', overrides.ip || draft.context.ip, isDomain);
  }

  // --- Quick Action: Print Official Police Letterhead ---
  function printNotice() {
    let printContainer = document.getElementById('legalPrintContainer');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'legalPrintContainer';
      document.body.appendChild(printContainer);
    }

    const tMeta = TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0];
    const editor = document.getElementById('legalDraftEditor');
    const noticeContent = editor ? editor.value : state.noticeBody;

    printContainer.innerHTML = `
      <div class="police-watermark">CONFIDENTIAL // LEA ONLY</div>
      <div class="police-print-header">
        <h1>RAJASTHAN POLICE · CYBER CRIME INVESTIGATION BRANCH</h1>
        <h2>CYBER CRIME POLICE STATION, JAIPUR RANGE</h2>
        <p style="margin:4px 0 0;font-size:10pt;color:#333;">Statutory Requisition under ${tMeta.statute} | Incident Command 1930</p>
      </div>
      <div class="police-print-body">${noticeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div class="police-signature-box">
        <br><br>
        <p><b>(Authorized Signatory / IO)</b><br>
        Cyber Crime Police Station<br>
        Rajasthan Police</p>
      </div>
    `;

    printContainer.style.display = 'block';
    window.print();
    setTimeout(() => {
      printContainer.style.display = 'none';
    }, 1000);
  }

  // --- Quick Action: Download Notice as .txt ---
  function downloadNotice() {
    const editor = document.getElementById('legalDraftEditor');
    const text = editor ? editor.value : state.noticeBody;
    const tMeta = TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0];
    const filename = `Statutory_Notice_${tMeta.id}_${state.referenceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`💾 Saved: ${filename}`);
  }

  // --- Quick Action: Send via Email (mailto:) ---
  function dispatchMailto() {
    const editor = document.getElementById('legalDraftEditor');
    const text = editor ? editor.value : state.noticeBody;
    const recipient = state.recipientEmail || 'nodal.cyber@bank-portal.test';
    const subject = state.noticeSubject || 'Statutory Notice under BNSS 2023';

    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.location.href = mailtoUrl;
    showToast(`✉️ Launching email client for ${recipient}`);
  }

  // --- Full Page View: "Requests" Navigation Studio ---
  function renderRequestsPage() {
    const activeCase = window.state?.case || {};
    const accounts = window.accounts ? window.accounts() : [];
    const domains = window.state?.intelDomains || [];

    return `
      <div class="page-head">
        <div>
          <span class="eyebrow">STATUTORY LEGAL PROCESS & NOTICES</span>
          <h1>Legal Requisitions & Notice Studio</h1>
          <p class="muted">Automated statutory directives conforming to Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 and Information Technology Act, 2000.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span class="pill pill-high" style="font-weight:700;">⚖️ BNSS 2023 COMPLIANT</span>
          <button class="btn btn-primary" onclick="window.LegalDraftModule.openModal({ type: 'BANK_FREEZE' })">
            📜 Open Quick Drafting Modal
          </button>
        </div>
      </div>

      <div class="legal-hub-layout">
        <!-- Sidebar: Statutory Templates & Entity Quick Picker -->
        <div class="legal-hub-sidebar">
          <div style="font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.04em;">
            Select Statutory Template
          </div>

          ${TEMPLATES.map(t => `
            <div class="legal-template-card ${t.id === state.currentTemplate ? 'active' : ''}" data-hub-template="${t.id}">
              <h4>
                <span>${t.title}</span>
                ${t.urgent ? '<span class="legal-badge-pill legal-badge-urgent">URGENT</span>' : ''}
              </h4>
              <div class="statute">${t.statute} <small style="color:#64748b;">(formerly ${t.formerStatute})</small></div>
              <p>${t.description}</p>
              <div style="margin-top:8px;font-size:10.5px;color:#0e7490;font-weight:600;">
                ⏳ Compliance Deadline: ${t.deadline}
              </div>
            </div>
          `).join('')}

          <!-- Quick Case Entity Selector -->
          <div class="card" style="padding:14px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
            <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:8px;">
              TARGET ENTITY IN CURRENT CASE
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;">
              ${accounts.slice(0, 3).map(acc => `
                <button class="btn btn-secondary btn-sm" style="text-align:left;justify-content:flex-start;"
                  onclick="window.LegalDraftModule.openModal({ type: 'BANK_FREEZE', account: '${acc.id}', name: '${acc.id}', amount: ${activeCase.amount || 485000} })">
                  🏦 Account: <b>${acc.id}</b>
                </button>
              `).join('')}
              ${domains.slice(0, 2).map(d => `
                <button class="btn btn-secondary btn-sm" style="text-align:left;justify-content:flex-start;"
                  onclick="window.LegalDraftModule.openModal({ type: 'REGISTRAR_NOTICE', domain: '${d.domain}', ip: '${d.ip}', ns: '${d.ns}', abuse: '${d.abuseContact}' })">
                  🌐 Domain: <b>${d.domain}</b>
                </button>
              `).join('')}
              <button class="btn btn-secondary btn-sm" style="text-align:left;justify-content:flex-start;"
                onclick="window.LegalDraftModule.openModal({ type: 'TELECOM_CDR', mobile: '+91-9876543210', telecom: 'Bharti Airtel Ltd.' })">
                📱 Mobile: <b>+91-9876543210 (Airtel)</b>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Workspace: Interactive Live Studio -->
        <div class="legal-hub-main">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
            <div>
              <h3 id="hubStudioTitle" style="margin:0;font-size:16px;color:#0f172a;">
                ${(TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0]).title}
              </h3>
              <p id="hubStudioStatute" style="margin:2px 0 0;font-size:11.5px;color:#0284c7;font-weight:600;">
                ${(TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0]).statute}
              </p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="legal-btn legal-btn-secondary" id="hubPrintBtn">🖨️ Print / Save PDF</button>
              <button class="legal-btn legal-btn-emerald" id="hubCopyBtn">📋 Copy Notice</button>
              <button class="legal-btn legal-btn-primary" id="hubMailtoBtn">✉️ Dispatch</button>
            </div>
          </div>

          <div style="display:flex;gap:12px;font-size:11px;color:#475569;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;">
            <span>Case Ref: <b>${activeCase.caseId || 'CR-2026-OCT-4287'}</b></span>
            <span>Victim: <b>${activeCase.victimName || 'Meera Nair'}</b></span>
            <span>Disputed UTR: <b>${activeCase.utr || '428714563201'}</b></span>
            <span>Loss: <b style="color:#b91c1c;">${formatMoneyINR(activeCase.amount || 485000)}</b></span>
          </div>

          <!-- Studio Textarea -->
          <textarea id="hubNoticeEditor" class="legal-notice-editor" style="height:480px;" spellcheck="false"></textarea>
        </div>
      </div>
    `;
  }

  function wireRequestsPage() {
    const editor = document.getElementById('hubNoticeEditor');
    const copyBtn = document.getElementById('hubCopyBtn');
    const printBtn = document.getElementById('hubPrintBtn');
    const mailtoBtn = document.getElementById('hubMailtoBtn');
    const templateCards = document.querySelectorAll('[data-hub-template]');

    // Generate initial studio draft
    const draft = compileNoticeDraft(state.currentTemplate, state.currentEntity);
    state.noticeSubject = draft.subject;
    state.noticeBody = draft.body;
    state.recipientEmail = draft.recipientEmail;
    state.referenceNo = draft.referenceNo;

    if (editor) {
      editor.value = draft.body;
      editor.addEventListener('input', (e) => {
        state.noticeBody = e.target.value;
      });
    }

    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        templateCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.currentTemplate = card.dataset.hubTemplate;

        const newDraft = compileNoticeDraft(state.currentTemplate, state.currentEntity);
        state.noticeSubject = newDraft.subject;
        state.noticeBody = newDraft.body;
        state.recipientEmail = newDraft.recipientEmail;
        state.referenceNo = newDraft.referenceNo;

        if (editor) editor.value = newDraft.body;
        const tMeta = TEMPLATES.find(t => t.id === state.currentTemplate) || TEMPLATES[0];
        const titleEl = document.getElementById('hubStudioTitle');
        const statuteEl = document.getElementById('hubStudioStatute');
        if (titleEl) titleEl.textContent = tMeta.title;
        if (statuteEl) statuteEl.textContent = tMeta.statute;
      });
    });

    copyBtn?.addEventListener('click', () => {
      const textToCopy = editor ? editor.value : state.noticeBody;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('📋 Statutory notice copied to clipboard!');
      });
    });

    printBtn?.addEventListener('click', () => {
      printNotice();
    });

    mailtoBtn?.addEventListener('click', () => {
      dispatchMailto();
    });
  }

  // --- Contextual Injection Observers ---
  // Periodically spot-check dynamic drawers / cards and attach buttons if needed
  function checkAndInjectButtons() {
    // 1. Money Trail Drawer Quick Actions
    const drawerActions = document.querySelector('#trailDrawer .drawer-section-title + div');
    if (drawerActions && !drawerActions.querySelector('.btn-trail-legal-notice')) {
      const selNode = window.state?.trailSelectedNode;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-trail-legal-notice';
      btn.style.marginTop = '4px';
      btn.innerHTML = '📜 Draft Statutory Legal Notice';
      btn.onclick = () => {
        const node = window.state?.trailSelectedNode || {};
        openModal({
          type: 'BANK_FREEZE',
          account: node.account_no || node.id,
          name: node.name || node.id,
          bank: node.bank || 'State Bank of India',
          amount: node.amount || window.state?.case?.amount,
          utr: node.transactions_in?.[0]?.utr || window.state?.case?.utr
        });
      };
      drawerActions.appendChild(btn);
    }
  }

  // --- Global Module Export ---
  window.LegalDraftModule = {
    TEMPLATES,
    openModal,
    closeModal,
    generateNotice: compileNoticeDraft,
    renderRequestsPage,
    wireRequestsPage,
    printNotice,
    downloadNotice,
    dispatchMailto,
    init: function() {
      ensureModalInDOM();
      setInterval(checkAndInjectButtons, 1200);
    }
  };

  // Auto-init once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.LegalDraftModule.init());
  } else {
    window.LegalDraftModule.init();
  }
})();
