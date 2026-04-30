/**
 * CivilIQ — Demo Seed Script
 *
 * Creates a realistic demo workspace for a mid-sized Indian civil construction firm.
 * Run from: apps/api/   →   npm run db:seed
 *
 * Login after seeding:
 *   Email:    admin@abcconstructions.in
 *   Password: Demo@CivilIQ2026
 */

// Load .env before anything else
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Neon free tier suspends compute — retry until it wakes up
async function waitForDb(retries = 8, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅  Database is awake!\n');
      return;
    } catch (e: any) {
      if (i === 0) console.log('⏳  Waking up Neon database (free tier — takes ~10s)...');
      else process.stdout.write('.');
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database did not wake up after retries. Check your Neon console.');
}

async function main() {
  await waitForDb();
  console.log('🌱  Seeding CivilIQ demo workspace…\n');

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'abc-constructions' },
    update: {},
    create: {
      name: 'ABC Constructions Pvt Ltd',
      slug: 'abc-constructions',
      planTier: 'PROFESSIONAL',
      settings: {
        defaultCurrency: 'INR',
        defaultUnits: 'metric',
        timezone: 'Asia/Kolkata',
        languagePreference: 'en',
      },
    },
  });
  console.log(`✅  Tenant: ${tenant.name}`);

  // ── Users ────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo@CivilIQ2026', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@abcconstructions.in' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@abcconstructions.in',
        name: 'Pradhap Murugesan',
        passwordHash,
        role: 'OWNER',
        phone: '+91 98400 12345',
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'ravi@abcconstructions.in' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'ravi@abcconstructions.in',
        name: 'Ravi Shankar',
        passwordHash,
        role: 'PROJECT_MANAGER',
        phone: '+91 98401 23456',
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'meena@abcconstructions.in' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'meena@abcconstructions.in',
        name: 'Meena Krishnan',
        passwordHash,
        role: 'QUANTITY_SURVEYOR',
        phone: '+91 98402 34567',
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'arjun@abcconstructions.in' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'arjun@abcconstructions.in',
        name: 'Arjun Nair',
        passwordHash,
        role: 'SITE_ENGINEER',
        phone: '+91 98403 45678',
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'divya@abcconstructions.in' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'divya@abcconstructions.in',
        name: 'Divya Menon',
        passwordHash,
        role: 'FINANCE_CONTROLLER',
        phone: '+91 98404 56789',
      },
    }),
  ]);
  console.log(`✅  Users: ${users.map(u => u.name).join(', ')}`);

  const [admin, ravi, meena, arjun, divya] = users;

  // ── Clients ───────────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: tenant.id,
        name: 'Tamil Nadu Highways Department',
        type: 'Government',
        contactName: 'Mr. Senthilkumar IAS',
        contactEmail: 'pwd.highways@tn.gov.in',
        contactPhone: '+91 44 2345 6789',
        address: 'Highways Building, Chepauk, Chennai 600 005',
        gstNumber: '33AAACT1234F1Z5',
        relationshipScore: 85,
      },
    }),
    prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        tenantId: tenant.id,
        name: 'Prestige Estates Projects Ltd',
        type: 'Private',
        contactName: 'Suresh Reddy',
        contactEmail: 'projects@prestigegroup.com',
        contactPhone: '+91 80 2347 8900',
        address: '9th Floor, Prestige Meridian, MG Road, Bengaluru 560 001',
        gstNumber: '29AAACM7890B1ZP',
        relationshipScore: 92,
      },
    }),
    prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        tenantId: tenant.id,
        name: 'NHAI — National Highways Authority',
        type: 'Government',
        contactName: 'CGM Rajendra Prasad',
        contactEmail: 'cgm.south@nhai.gov.in',
        contactPhone: '+91 11 2507 4100',
        address: 'Plot No. G-5&6, Sector 10, Dwarka, New Delhi 110 075',
        relationshipScore: 78,
      },
    }),
  ]);
  console.log(`✅  Clients: ${clients.map(c => c.name).join(', ')}`);

  const [tnhd, prestige, nhai] = clients;

  // ── Projects ──────────────────────────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: '00000000-0000-0000-0001-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000001',
        tenantId: tenant.id,
        clientId: tnhd.id,
        name: 'NH-48 Bengaluru–Chennai Corridor Widening (Phase 2)',
        code: 'PRJ-2024-001',
        description: 'Four-laning of NH-48 from Krishnagiri to Vellore (68 km). Includes elevated interchange at Vaniyambadi.',
        contractValue: 245_00_00_000,
        currency: 'INR',
        status: 'IN_PROGRESS',
        phase: 'EXECUTION',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2026-08-31'),
        siteAddress: 'NH-48, Krishnagiri to Vellore, Tamil Nadu',
        siteLatitude: 12.5204,
        siteLongitude: 78.2137,
      },
    }),
    prisma.project.upsert({
      where: { id: '00000000-0000-0000-0001-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000002',
        tenantId: tenant.id,
        clientId: prestige.id,
        name: 'Prestige Celestia — Basement & Podium Structure',
        code: 'PRJ-2025-007',
        description: 'RCC structural works for 3-level basement + ground + podium (B3 to PL). Total area 1.2 lakh sqft.',
        contractValue: 38_50_00_000,
        currency: 'INR',
        status: 'IN_PROGRESS',
        phase: 'EXECUTION',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2026-06-30'),
        siteAddress: 'Sarjapur Road, Bengaluru 560 035',
        siteLatitude: 12.8917,
        siteLongitude: 77.6972,
      },
    }),
    prisma.project.upsert({
      where: { id: '00000000-0000-0000-0001-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000003',
        tenantId: tenant.id,
        clientId: nhai.id,
        name: 'Vandalur–Walajabad 6-Lane Greenfield Expressway',
        code: 'PRJ-2025-012',
        description: 'New greenfield 6-lane expressway (32 km). 4 interchanges, 2 ROBs, 14 minor bridges.',
        contractValue: 512_00_00_000,
        currency: 'INR',
        status: 'AWARDED',
        phase: 'MOBILISATION',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2028-12-31'),
        siteAddress: 'Vandalur to Walajabad, Tamil Nadu',
      },
    }),
    prisma.project.upsert({
      where: { id: '00000000-0000-0000-0001-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000004',
        tenantId: tenant.id,
        clientId: prestige.id,
        name: 'Prestige Lakeside Habitat — Phase 1 Civil',
        code: 'PRJ-2023-003',
        description: 'Completed civil works for residential towers T1–T4. Handed over Oct 2024.',
        contractValue: 62_00_00_000,
        currency: 'INR',
        status: 'COMPLETED',
        phase: 'CLOSED',
        startDate: new Date('2023-04-01'),
        endDate: new Date('2024-10-31'),
        siteAddress: 'Whitefield, Bengaluru 560 066',
      },
    }),
  ]);
  console.log(`✅  Projects: ${projects.map(p => p.code).join(', ')}`);

  const [nh48, celestia, expressway] = projects;

  // ── Work Packages ─────────────────────────────────────────────────────────
  const wp = await Promise.all([
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000001', tenantId: tenant.id, projectId: nh48.id, name: 'Earthwork & Grading', code: 'EW-01', unit: 'm³', quantity: 485000, rate: 120, completedQty: 312000, zone: 'Krishnagiri–Hosur' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000002', tenantId: tenant.id, projectId: nh48.id, name: 'Granular Sub-Base (GSB)', code: 'GSB-01', unit: 'm³', quantity: 95000, rate: 850, completedQty: 61000, zone: 'Full corridor' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000003', tenantId: tenant.id, projectId: nh48.id, name: 'WMM (Wet Mix Macadam)', code: 'WMM-01', unit: 'm³', quantity: 72000, rate: 1200, completedQty: 38000, zone: 'Full corridor' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000004', tenantId: tenant.id, projectId: nh48.id, name: 'DBM Bituminous Layer', code: 'DBM-01', unit: 'm²', quantity: 540000, rate: 280, completedQty: 0, zone: 'Full corridor' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000005' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000005', tenantId: tenant.id, projectId: celestia.id, name: 'Piling Works (600mm dia)', code: 'PIL-01', unit: 'nos', quantity: 348, rate: 85000, completedQty: 348, zone: 'Full footprint', level: 'B3' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000006' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000006', tenantId: tenant.id, projectId: celestia.id, name: 'Basement Raft Slab (M35)', code: 'RFT-01', unit: 'm³', quantity: 4200, rate: 9500, completedQty: 4200, zone: 'Full footprint', level: 'B3' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000007' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000007', tenantId: tenant.id, projectId: celestia.id, name: 'Basement Retaining Walls', code: 'RW-01', unit: 'm³', quantity: 1850, rate: 11000, completedQty: 1120, zone: 'Perimeter', level: 'B3–B1' } }),
    prisma.workPackage.upsert({ where: { id: '00000000-0000-0000-0003-000000000008' }, update: {}, create: { id: '00000000-0000-0000-0003-000000000008', tenantId: tenant.id, projectId: celestia.id, name: 'Podium Slab (M30)', code: 'POD-01', unit: 'm²', quantity: 12400, rate: 1800, completedQty: 5600, zone: 'Full podium', level: 'PL' } }),
  ]);
  const [wpEW, wpGSB, wpWMM, wpDBM, wpPIL, wpRFT, wpRW, wpPOD] = wp;
  console.log(`✅  Work Packages: 8 created`);

  // ── Subcontractors ────────────────────────────────────────────────────────
  const subcons = await Promise.all([
    prisma.subcontractor.upsert({
      where: { id: '00000000-0000-0000-0002-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000001',
        tenantId: tenant.id,
        name: 'Raghavendra RCC Works',
        contactName: 'Raghavendra Rao',
        contactPhone: '+91 94440 11223',
        specialisation: ['RCC', 'Formwork'],
        performanceScore: 88,
      },
    }),
    prisma.subcontractor.upsert({
      where: { id: '00000000-0000-0000-0002-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000002',
        tenantId: tenant.id,
        name: 'Sri Murugan Road Layers',
        contactName: 'Murugan K',
        contactPhone: '+91 94441 22334',
        specialisation: ['Road', 'Bituminous', 'GSB'],
        performanceScore: 74,
        isBlacklisted: false,
      },
    }),
  ]);
  console.log(`✅  Subcontractors: ${subcons.map(s => s.name).join(', ')}`);

  // ── Materials ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000001', tenantId: tenant.id, projectId: nh48.id, workPackageId: wpWMM.id, name: 'Wet Mix Macadam (WMM)', specification: 'WMM as per MoRTH Spec. Cl. 406. Grading II. CBR ≥ 30%', unit: 'm³', status: 'DELIVERED', quantityOrdered: 72000, quantityDelivered: 68500, quantityBilled: 68500, quantityInstalled: 61000, ratePerUnit: 1200, supplierName: 'TN Stone Crushers Pvt Ltd', poNumber: 'PO-NH48-0041', poDate: new Date('2025-02-10'), deliveryDate: new Date('2025-09-15') } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000002', tenantId: tenant.id, projectId: nh48.id, workPackageId: wpGSB.id, name: 'Granular Sub-Base (GSB) Material', specification: 'GSB as per MoRTH Cl. 401. Grading I. PI ≤ 6', unit: 'm³', status: 'DELIVERED', quantityOrdered: 95000, quantityDelivered: 91200, quantityBilled: 91200, quantityInstalled: 61000, ratePerUnit: 850, supplierName: 'TN Stone Crushers Pvt Ltd', poNumber: 'PO-NH48-0039', poDate: new Date('2024-11-05') } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000003', tenantId: tenant.id, projectId: nh48.id, name: 'Steel Reinforcement (Fe 500D)', specification: 'TMT bars Fe 500D as per IS:1786. Supplier test cert required.', unit: 'MT', status: 'MISMATCH', quantityOrdered: 1850, quantityDelivered: 1640, quantityBilled: 1850, quantityInstalled: 1320, ratePerUnit: 72000, supplierName: 'JSW Steel Ltd', poNumber: 'PO-NH48-0044', poDate: new Date('2025-04-01'), deliveredSpec: 'Fe 415D supplied instead of Fe 500D — grade mismatch on 210 MT. Test certs attached.', grnNumber: 'GRN-2025-0812' } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000004', tenantId: tenant.id, projectId: celestia.id, workPackageId: wpRFT.id, name: 'Ready Mix Concrete M35', specification: 'M35 grade RMC as per IS:456. w/c ≤ 0.40. Admixture permitted.', unit: 'm³', status: 'INSTALLED', quantityOrdered: 4200, quantityDelivered: 4200, quantityBilled: 4200, quantityInstalled: 4200, ratePerUnit: 9500, supplierName: 'UltraTech RMC — Bengaluru Plant 3', poNumber: 'PO-CEL-0018', poDate: new Date('2025-01-20') } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000005' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000005', tenantId: tenant.id, projectId: celestia.id, workPackageId: wpRW.id, name: 'Ready Mix Concrete M30 (Retaining Walls)', specification: 'M30 grade RMC. Waterproofing admixture Sika WT-200P @ 2% by weight of cement.', unit: 'm³', status: 'PO_RAISED', quantityOrdered: 1850, quantityDelivered: 1120, quantityBilled: 1120, quantityInstalled: 1120, ratePerUnit: 9200, supplierName: 'UltraTech RMC — Bengaluru Plant 3', poNumber: 'PO-CEL-0023', poDate: new Date('2025-08-10') } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000006' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000006', tenantId: tenant.id, projectId: celestia.id, name: 'Steel Reinforcement (Fe 500D)', specification: 'TMT bars Fe 500D IS:1786. Sizes: 8mm to 32mm.', unit: 'MT', status: 'PO_RAISED', quantityOrdered: 2400, quantityDelivered: 1680, quantityBilled: 1680, quantityInstalled: 1540, ratePerUnit: 71500, supplierName: 'Tata Steel BSL Ltd', poNumber: 'PO-CEL-0021', poDate: new Date('2025-06-15') } }),
    prisma.material.upsert({ where: { id: '00000000-0000-0000-0004-000000000007' }, update: {}, create: { id: '00000000-0000-0000-0004-000000000007', tenantId: tenant.id, projectId: celestia.id, workPackageId: wpPOD.id, name: 'Shuttering Plywood (18mm BWP)', specification: '18mm BWP grade shuttering ply IS:710. Min 8 reuses guaranteed.', unit: 'sqm', status: 'DELIVERED', quantityOrdered: 18000, quantityDelivered: 18000, quantityBilled: 18000, quantityInstalled: 12400, ratePerUnit: 165, supplierName: 'Kitply Industries', poNumber: 'PO-CEL-0015', poDate: new Date('2025-01-05') } }),
  ]);
  console.log(`✅  Materials: 7 created (1 MISMATCH flagged on NH-48 steel)`);

  // ── Running Account Bills ────────────────────────────────────────────────
  await Promise.all([
    prisma.runningAccountBill.upsert({ where: { id: '00000000-0000-0000-0005-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0005-000000000001', tenantId: tenant.id, projectId: nh48.id, billNumber: 'RA-001', billDate: new Date('2024-09-30'), status: 'PAID', grossAmount: 48500000, deductions: 2425000, netAmount: 46075000, certifiedAmount: 46075000, paidAmount: 46075000, submittedDate: new Date('2024-10-05'), certifiedDate: new Date('2024-10-20'), paidDate: new Date('2024-11-10'), notes: 'Earthwork (EW-01): 155,000 m³ @ ₹120. GSB-01: 32,000 m³.' } }),
    prisma.runningAccountBill.upsert({ where: { id: '00000000-0000-0000-0005-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0005-000000000002', tenantId: tenant.id, projectId: nh48.id, billNumber: 'RA-002', billDate: new Date('2025-01-31'), status: 'PAID', grossAmount: 72000000, deductions: 3600000, netAmount: 68400000, certifiedAmount: 68400000, paidAmount: 68400000, submittedDate: new Date('2025-02-08'), certifiedDate: new Date('2025-02-25'), paidDate: new Date('2025-03-18'), notes: 'EW-01: 90,000 m³. GSB-01: 29,200 m³. WMM-01: 38,000 m³.' } }),
    prisma.runningAccountBill.upsert({ where: { id: '00000000-0000-0000-0005-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0005-000000000003', tenantId: tenant.id, projectId: nh48.id, billNumber: 'RA-003', billDate: new Date('2025-10-31'), status: 'UNDER_CERTIFICATION', grossAmount: 89500000, deductions: 4475000, netAmount: 85025000, paidAmount: 0, submittedDate: new Date('2025-11-07'), notes: 'WMM-01 balance + steel reinforcement milestone. Pending DQC test report.' } }),
    prisma.runningAccountBill.upsert({ where: { id: '00000000-0000-0000-0005-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0005-000000000004', tenantId: tenant.id, projectId: celestia.id, billNumber: 'RA-001', billDate: new Date('2025-03-31'), status: 'PAID', grossAmount: 52000000, deductions: 2600000, netAmount: 49400000, certifiedAmount: 49400000, paidAmount: 49400000, submittedDate: new Date('2025-04-05'), certifiedDate: new Date('2025-04-18'), paidDate: new Date('2025-04-30'), notes: 'Piling works (348 nos) + raft slab (4,200 m³) fully completed.' } }),
    prisma.runningAccountBill.upsert({ where: { id: '00000000-0000-0000-0005-000000000005' }, update: {}, create: { id: '00000000-0000-0000-0005-000000000005', tenantId: tenant.id, projectId: celestia.id, billNumber: 'RA-002', billDate: new Date('2025-09-30'), status: 'SUBMITTED', grossAmount: 31500000, deductions: 1575000, netAmount: 29925000, paidAmount: 0, submittedDate: new Date('2025-10-08'), notes: 'Retaining walls B3–B1: 1,120 m³. Podium slab: 5,600 m².' } }),
  ]);
  console.log(`✅  RA Bills: 5 created (₹8.5Cr pending on NH-48, ₹3Cr submitted on Celestia)`);

  // ── Notifications ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notification.upsert({ where: { id: '00000000-0000-0000-0006-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0006-000000000001', tenantId: tenant.id, projectId: nh48.id, userId: admin.id, eventType: 'material.mismatch', severity: 'CRITICAL', title: 'Steel Grade Mismatch — NH-48', body: 'JSW Steel supplied Fe 415D instead of specified Fe 500D on PO-NH48-0044 (210 MT affected). Immediate QC review required.', payload: { poNumber: 'PO-NH48-0044', affectedQty: 210, unit: 'MT' }, seen: false } }),
    prisma.notification.upsert({ where: { id: '00000000-0000-0000-0006-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0006-000000000002', tenantId: tenant.id, projectId: nh48.id, userId: admin.id, eventType: 'bill.awaiting_certification', severity: 'WARNING', title: 'RA-003 Under Certification for 78 Days', body: 'NH-48 RA Bill RA-003 (Rs.8.50 Cr) submitted on 07-Nov-2025 is still under TNHD certification. Consider escalating to DGM.', payload: { daysElapsed: 78, amount: 85025000 }, seen: false } }),
    prisma.notification.upsert({ where: { id: '00000000-0000-0000-0006-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0006-000000000003', tenantId: tenant.id, projectId: celestia.id, userId: admin.id, eventType: 'bill.submitted', severity: 'INFO', title: 'Celestia RA-002 Submitted', body: 'Running Account Bill RA-002 for Prestige Celestia (Rs.2.99 Cr) has been submitted and awaits Prestige certification.', payload: { amount: 29925000 }, seen: true } }),
    prisma.notification.upsert({ where: { id: '00000000-0000-0000-0006-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0006-000000000004', tenantId: tenant.id, projectId: nh48.id, userId: admin.id, eventType: 'agent.risk_alert', severity: 'WARNING', title: 'DBM Layer at Risk — Schedule Slippage', body: 'DBM Bituminous works have 0% completion with only 4 months to contract end. Risk of liquidated damages estimated at Rs.2.45 Cr.', payload: { completedPct: 0, riskAmount: 24500000 }, seen: false } }),
  ]);
  console.log(`✅  Notifications: 4 created (2 critical/warning unread)`);

  // ── Agent Jobs ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.agentJob.upsert({ where: { id: '00000000-0000-0000-0007-000000000001' }, update: {}, create: { id: '00000000-0000-0000-0007-000000000001', tenantId: tenant.id, projectId: nh48.id, createdById: admin.id, agentType: 'RECONCILIATION', status: 'COMPLETED', input: { trigger: 'manual', scope: 'project' }, output: { mismatches: 1, itemsChecked: 7, recommendation: 'Review Fe 500D steel delivery on PO-NH48-0044' }, startedAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 3540000), durationMs: 62000 } }),
    prisma.agentJob.upsert({ where: { id: '00000000-0000-0000-0007-000000000002' }, update: {}, create: { id: '00000000-0000-0000-0007-000000000002', tenantId: tenant.id, projectId: nh48.id, createdById: admin.id, agentType: 'RISK', status: 'COMPLETED', input: { trigger: 'scheduled', scope: 'project' }, output: { risksFound: 2, critical: 0, warnings: 2, summary: 'DBM layer schedule slippage. RA-003 certification delay.' }, startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86370000), durationMs: 30000 } }),
    prisma.agentJob.upsert({ where: { id: '00000000-0000-0000-0007-000000000003' }, update: {}, create: { id: '00000000-0000-0000-0007-000000000003', tenantId: tenant.id, projectId: celestia.id, createdById: meena.id, agentType: 'INTAKE', status: 'COMPLETED', input: { fileName: 'Celestia_BOQ_Rev3.pdf' }, output: { itemsExtracted: 48, confidence: 0.94, templateMatch: 'Standard BOQ v3' }, startedAt: new Date(Date.now() - 172800000), completedAt: new Date(Date.now() - 172680000), durationMs: 120000 } }),
    prisma.agentJob.upsert({ where: { id: '00000000-0000-0000-0007-000000000004' }, update: {}, create: { id: '00000000-0000-0000-0007-000000000004', tenantId: tenant.id, projectId: nh48.id, createdById: admin.id, agentType: 'CHASE', status: 'COMPLETED', input: { trigger: 'manual' }, output: { emailDrafted: true, recipient: 'pwd.highways@tn.gov.in', subject: 'Certification Follow-up: RA-003 — NH-48 Phase 2' }, startedAt: new Date(Date.now() - 259200000), completedAt: new Date(Date.now() - 259180000), durationMs: 18000 } }),
  ]);
  console.log(`✅  Agent Jobs: 4 historical runs seeded`);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🎉  Seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌐  App URL   →  http://localhost:3000');
  console.log('  📧  Email     →  admin@abcconstructions.in');
  console.log('  🔑  Password  →  Demo@CivilIQ2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  Firm: ABC Constructions Pvt Ltd');
  console.log('  Projects: 4  (2 active, 1 awarded, 1 completed)');
  console.log('  Portfolio: ₹858 Cr');
  console.log('  Team: 5 members');
  console.log('  Alerts: 1 steel mismatch 🔴  |  1 schedule risk 🟡  |  1 stale certification 🟡');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('❌  Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
