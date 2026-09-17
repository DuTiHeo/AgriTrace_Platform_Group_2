📋 Table of Contents
- [1. Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
- [2. System Architecture & The 4 Core Pillars](#2-system-architecture--the-4-core-pillars)
- [3. Core Functional Modules](#3-core-functional-modules)
  - [Module 1: Digital Production & Farmer QuickLog](#module-1-digital-production--farmer-quicklog)
  - [Module 2: Processing, Logistics & Lot Lineage (Blending & Splitting)](#module-2-processing-logistics--lot-lineage-blending--splitting)
  - [Module 3: IoT Cold Chain Telemetry Monitoring](#module-3-iot-cold-chain-telemetry-monitoring)
  - [Module 4: Auditor Gatekeeper, Blockchain & Consumer Portal](#module-4-auditor-gatekeeper-blockchain--consumer-portal)
  - [Module 5: Administration, Security & Shared Services](#module-5-administration-security--shared-services)
- [4. Recommended Technology Stack](#4-recommended-technology-stack)
- [5. End-to-End Workflow & Data Flow](#5-end-to-end-workflow--data-flow)
- [6. Quality Standards & Definition of Done](#6-quality-standards--definition-of-done)

---

## 1. Executive Summary & Problem Statement

Modern agricultural supply chains face critical transparency barriers that degrade consumer trust and market efficiency [1, 2]:

* **Manual Data Entry Vulnerabilities**: Traditional paper-based logs and fragmented spreadsheets lead to human recording errors, high labor overhead, and lack of real-time visibility [1, 2].
* **Counterfeit & Swapped Labels**: Static printed QR codes can easily be duplicated, re-printed in bulk, or swapped onto uncertified products [1, 2].
* **Lack of Independent Quality Verification (Garbage In, Garbage Out - GIGO)**: Self-declared claims by growers without independent lab verification result in unreliable traceability systems filled with unverified data [3, 4].
* **Cold Chain Disruptions**: Unmonitored environmental conditions (temperature and humidity) during transit and storage cause product spoilage and unassignable liability when quality drops [3, 4].

**AgriTrace Platform** resolves these structural barriers by establishing an enterprise multi-tenant supply chain platform uniting Farm Owners, Workers, Independent Quality Auditors, Logistics Providers, Retailers, and End Consumers [4, 5].

---

## 2. System Architecture & The 4 Core Pillars

AgriTrace grounds its end-to-end trust model on **four technological pillars** [5, 6]:

+-----------------------------------------------------------------------------------+ |                                 AGRITRACE PLATFORM                                | +------------------+-----------------------+--------------------+-------------------+ |  1. IoT SENSORS  | 2. AUDITOR GATEKEEPER | 3. DYNAMIC LABELS  | 4. IMMUTABLE DB   | | Real-time 2°C–8°C| Independent Quality   | Dynamic SUN MAC    | Smart Contract    | | Cold Chain & GPS | Verification (Anti-   | NFC/QR anti-clone  | Hash Chain & On-  | | Telemetry
   | GIGO Approval)
   | Security
      | Chain Proofs
 | +------------------+-----------------------+--------------------+-------------------+

1. **IoT Telemetry & Cold Chain Monitoring**: Continuous automated tracking of environmental parameters (2°C–8°C temperature range, humidity, and GPS coordinates) with real-time threshold violation detection [5, 6].
2. **Auditor Gatekeeper (Anti-GIGO Filter)**: Newly generated harvest batches default to an `UNVERIFIED` state [5, 8]. Only after an independent Auditor inspects records and attaches the cryptographic hash (SHA-256) of an accredited lab report is the batch upgraded to `AUDITED` and eligible for listing or on-chain commitment [5, 8, 9].
3. **Dynamic Smart Labels (NFC / Dynamic QR)**: Utilizes NXP NTAG424 DNA NFC chips generating AES-128 CMAC Dynamic Secure Unique NFC Messages (SUN MAC) on each tap, eliminating label copying, cloning, or physical swapping [7, 9-11].
4. **Immutable Storage (Blockchain / Proof of Integrity)**: Smart contracts (`Trace.sol`) record digital signatures, content hashes, and audit proofs on EVM networks (Polygon PoS / Sepolia Testnet) or an immutable hash-chain database ledger [7-9, 12].

---

## 3. Core Functional Modules

### Module 1: Digital Production & Farmer QuickLog
*Focuses on field-level digitizing, geospatial boundaries, and friction-free field logging [13, 14].*

* **GIS & Plot Mapping**: Digital mapping of farm boundaries using RFC 7946 Polygon GeoJSON coordinates [14, 15]. Area calculations (`area_ha`) and polygon enclosure validations are computed via Turf.js [15, 16].
* **Season & Crop Management**: Cataloging crop growth duration and automatically generating scheduled care alerts (fertilization, irrigation, spraying) [17-19].
* **Farmer QuickLog (1-Touch Logging)**:
  * **Voice-to-Text Input**: Integrates W3C Web Speech API (`SpeechRecognition`) for hands-free field log entries [20, 21].
  * **Media & GPS Proof**: Camera photo capture coupled with automatic smartphone GPS location tagging [21, 22].
  * **Offline-First Storage**: Caches entries locally in IndexedDB via Dexie.js during network outages, auto-syncing upon reconnection [20].
* **Batch Initialization**: Aggregates seasonal output into tradeable harvest batches, assigning a unique identifier following the standard format: `BATCH-{org_id}-{season_id}-{YYYYMMDD}-XXX` [23-25].
* **Team Leader Supervision**: Team leaders oversee field entries, leaving feedback notes (`log_notes`) without administrative blocking, maintaining operational continuity [26-28].

---

### Module 2: Processing, Logistics & Lot Lineage (Blending & Splitting)
*Tracks processing, transport dispatches, ownership transfers, and multi-farm lot composition [13, 29].*

* **Processing Logs**: Records washing, sorting, irradiation, quality screening, and packaging specs [29].
* **Shipment Dispatch & Driver App**: Assigns driver accounts, vehicle IDs, and shipment dispatches [29, 30]. Drivers record physical checkpoint arrivals and execute Custody Transfers via finite state transitions (`CREATED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `RECEIVED`) [29, 31].
* **Lot Lineage Graph (DAG Architecture)**:
  * **Lot Blending**: Combines harvests from multiple smallholder farmers into a unified processing lot [29].
  * **Lot Splitting**: Divides bulk batches into consumer-grade packages while maintaining lineage ancestry [29].
  * **Graph Traversal & Cycle Detection**: Implements Directed Acyclic Graph (DAG) algorithms (DFS/BFS) to calculate the precise percentage contribution of each individual farmer in the final blended product [29, 30, 32].
  * **Visualization**: Rendered interactively via ReactFlow / D3.js [30, 32].

---

### Module 3: IoT Cold Chain Telemetry Monitoring
*Ensures environmental integrity during transit and cold storage [13, 33].*

* **Telemetry Ingestion**: High-throughput ingestion of temperature, humidity, and GPS metrics from vehicle IoT Gateways via MQTT v5.0 or REST APIs [33-35].
* **Cold Chain Rule Engine (2°C–8°C)**: Evaluates incoming metrics against strict safe ranges [33].
* **Alert Throttling (Debounce Window Pattern)**: Suppresses alert floods when metrics oscillate around threshold boundaries by grouping continuous violations within 5–15 minute evaluation windows [33, 36].
* **Time-Series Analytics**: Optimized in PostgreSQL using BRIN indexing and time-bucket aggregations [36]. Rendered visually with safety-band indicators via Recharts / Chart.js [34, 35].

---

### Module 4: Auditor Gatekeeper, Blockchain & Consumer Portal
*Verifies product quality, records cryptographic proofs, and presents consumer-facing provenance [8, 10, 13].*

* **Auditor Gatekeeper**: Restricts unverified batches (`UNVERIFIED`) from public certification [5, 8]. Independent auditors inspect farm logs and upload lab test reports (PDFs) [8].
* **Cryptographic Verification**:
  * **JSON Canonicalization (RFC 8785)**: Standardizes payload formatting before computing SHA-256 hashes [11].
  * **SHA-256 Report Hashing**: Computes lab report hash, updating batch state to `AUDITED` [5, 8, 37].
* **Smart Contract / Proof of Integrity**: Smart contracts (`Trace.sol` using Solidity ^0.8.20 on Polygon PoS / Sepolia) or database hash chains record audit proofs and signatures immutably [7, 8, 12, 37].
* **Consumer Traceability Portal**: A 1-page mobile-first public portal presenting a **5-Step Storyline** upon scanning NFC/QR tags [10, 38, 39]:
  1. *Farm & Plot Origin*: Polygon boundary map, farm owner details, and crop variety [38, 39].
  2. *Cultivation History*: QuickLog timeline, field photos, and GPS tags [38, 39].
  3. *Quality Audit*: Auditor-approved lab test report with SHA-256 verification [38, 39].
  4. *Cold Chain Telemetry*: Temperature profile chart showing adherence to 2°C–8°C standards [38, 39].
  5. *Logistics & Custody*: Transport checkpoints and ownership transfer milestones [38, 39].

---

### Module 5: Administration, Security & Shared Services
*Enforces system security, role permissions, multi-tenant isolation, and maintenance [40-42].*

* **RBAC & Multi-Tenant Isolation**: Enforces Role-Based Access Control (Admin, Owner, Team Leader, Worker, Auditor, Driver) combined with mandatory `org_id` filtering across queries to prevent cross-tenant data leaks [26, 37, 43, 44].
* **Authentication**: Stateless session handling using JWT tokens (RFC 7519) and secure password hashing (BCrypt) [37, 45, 46].
* **Error Reporting (`UC-SH03` vs `UC-W02.1`)**: Separate workflows for software bug reports (`error_reports` sent to Admin) versus field agricultural incidents (crop disease/weather reported in `farming_logs`) [41, 47, 48].

---

## 4. Recommended Technology Stack

| Layer | Component / Tool | References |
| :--- | :--- | :--- |
| **Backend API** | Python (FastAPI / Flask) / Node.js (NestJS / Express) / Go (Gin) | [49] |
| **Database** | PostgreSQL (Relational + JSONB) + PostGIS extension | [15, 49] |
| **Web Dashboard** | React.js (Vite) + TypeScript + Tailwind CSS | [49] |
| **Mobile / PWA** | React Native (Expo) / PWA with IndexedDB (Dexie.js) | [20, 43, 49] |
| **Blockchain** | Solidity (^0.8.20), OpenZeppelin, Polygon PoS / Sepolia Testnet | [12, 37, 49] |
| **IoT / Telemetry** | REST Telemetry Ingest / MQTT v5.0, BRIN Indexing | [35, 36, 49] |
| **Security & NFC** | JWT (RFC 7519), RFC 8785 (JCS), SHA-256, NXP NTAG424 DNA SUN MAC | [11, 45, 50] |

---

## 5. End-to-End Workflow & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farm Worker
    actor Leader as Team Leader
    actor Auditor as Quality Auditor
    actor Driver as Logistics Driver
    actor Consumer as End Consumer

    Farmer->>Farmer: 1. Record field QuickLog (Voice/Photo/GPS)
    Farmer->>Leader: 2. Submit log (Auto-visible in Team Feed)
    Leader->>Leader: 3. Review log & attach feedback notes
    Farmer->>Farmer: 4. Harvest crop & initialize batch (UNVERIFIED)
    Auditor->>Auditor: 5. Inspect farm logs & upload PDF lab report
    Auditor->>Auditor: 6. Hash PDF (SHA-256) -> Upgrade to AUDITED
    Auditor->>Blockchain: 7. Commit Proof of Integrity / Smart Contract
    Driver->>Driver: 8. Transport shipment (IoT Gateways stream 2°C–8°C)
    Driver->>Driver: 9. Record Checkpoints & Custody Transfer
    Consumer->>Consumer: 10. Scan Dynamic NFC/QR on package
    Consumer->>Consumer: 11. View 5-Step Provenance Storyline
6. Quality Standards & Definition of Done
A feature is considered Complete (DoD) when
:
API & Database: Rest API returns standard JSON formatting with appropriate HTTP status codes, supported by updated PostgreSQL/PostGIS schemas
.
Multi-Tenant Security: Enforces JWT verification, RBAC permissions, and strict org_id data isolation
.
Data Integrity: Validates GeoJSON polygons, verifies SHA-256 lab hashes, and evaluates 2°C–8°C cold chain parameters
.
Documentation: Includes complete Postman collections, database schemas, Sequence Diagrams, and technical reports
.
