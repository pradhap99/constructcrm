import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeBill, billAgingDays, agingBucket, isBillOverdue } from '../bill-math.ts'

describe('computeBill — Indian RA-bill math', () => {
  it('canonical example: 10 L gross, 18/2/5%', () => {
    const r = computeBill({
      grossAmount: 10_00_000,
      gstRate: 18,
      tdsRate: 2,
      retentionRate: 5,
      mobAdvanceRecovery: 0,
      otherDeductions: 0,
    })
    assert.equal(r.gstAmount, 1_80_000)
    assert.equal(r.tdsAmount, 20_000)
    assert.equal(r.retentionAmount, 50_000)
    assert.equal(r.netAmount, 11_10_000)
  })

  it('zero gross produces all zeros, no NaN', () => {
    const r = computeBill({
      grossAmount: 0,
      gstRate: 18,
      tdsRate: 2,
      retentionRate: 5,
      mobAdvanceRecovery: 0,
      otherDeductions: 0,
    })
    assert.equal(r.gstAmount, 0)
    assert.equal(r.tdsAmount, 0)
    assert.equal(r.retentionAmount, 0)
    assert.equal(r.netAmount, 0)
    assert.ok(!Number.isNaN(r.netAmount))
  })

  it('zero rates: only gross flows to net', () => {
    const r = computeBill({
      grossAmount: 5_00_000,
      gstRate: 0,
      tdsRate: 0,
      retentionRate: 0,
      mobAdvanceRecovery: 0,
      otherDeductions: 0,
    })
    assert.equal(r.gstAmount, 0)
    assert.equal(r.tdsAmount, 0)
    assert.equal(r.retentionAmount, 0)
    assert.equal(r.netAmount, 5_00_000)
  })

  it('rounds floating-point drift cleanly', () => {
    // 1,23,456.78 × 18% = 22,222.2204 → must round to 22,222.22
    const r = computeBill({
      grossAmount: 1_23_456.78,
      gstRate: 18,
      tdsRate: 2,
      retentionRate: 5,
      mobAdvanceRecovery: 0,
      otherDeductions: 0,
    })
    assert.equal(r.gstAmount, 22_222.22)
    assert.equal(r.tdsAmount, 2_469.14)
    assert.equal(r.retentionAmount, 6_172.84)
    // Net = 1,23,456.78 + 22,222.22 − 2,469.14 − 6,172.84 = 1,37,037.02
    assert.equal(r.netAmount, 1_37_037.02)
  })

  it('deducts mob-advance recovery and other deductions', () => {
    const r = computeBill({
      grossAmount: 10_00_000,
      gstRate: 18,
      tdsRate: 2,
      retentionRate: 5,
      mobAdvanceRecovery: 50_000,
      otherDeductions: 10_000,
    })
    // Net = 10,00,000 + 1,80,000 − 20,000 − 50,000 − 50,000 − 10,000 = 10,50,000
    assert.equal(r.netAmount, 10_50_000)
  })

  it('rejects negative gross', () => {
    assert.throws(() =>
      computeBill({
        grossAmount: -1,
        gstRate: 18,
        tdsRate: 2,
        retentionRate: 5,
        mobAdvanceRecovery: 0,
        otherDeductions: 0,
      }),
    )
  })

  it('rejects out-of-range rates', () => {
    assert.throws(() =>
      computeBill({
        grossAmount: 10_00_000,
        gstRate: 60, // > 50%
        tdsRate: 2,
        retentionRate: 5,
        mobAdvanceRecovery: 0,
        otherDeductions: 0,
      }),
    )
  })

  it('high-retention scenario (10%)', () => {
    const r = computeBill({
      grossAmount: 20_00_000,
      gstRate: 18,
      tdsRate: 2,
      retentionRate: 10,
      mobAdvanceRecovery: 0,
      otherDeductions: 0,
    })
    assert.equal(r.retentionAmount, 2_00_000)
    // Net = 20,00,000 + 3,60,000 − 40,000 − 2,00,000 = 21,20,000
    assert.equal(r.netAmount, 21_20_000)
  })
})

describe('billAgingDays', () => {
  it('returns 0 when no reference date', () => {
    assert.equal(
      billAgingDays({ status: 'DRAFT', submittedDate: null, certifiedDate: null }),
      0,
    )
  })

  it('counts days from submittedDate for SUBMITTED bills', () => {
    const eight = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      billAgingDays({ status: 'SUBMITTED', submittedDate: eight, certifiedDate: null }),
      8,
    )
  })

  it('counts days from certifiedDate for CERTIFIED bills', () => {
    const forty = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      billAgingDays({ status: 'CERTIFIED', submittedDate: null, certifiedDate: forty }),
      40,
    )
  })
})

describe('agingBucket', () => {
  it('classifies correctly', () => {
    assert.equal(agingBucket(0), 'normal')
    assert.equal(agingBucket(15), 'normal')
    assert.equal(agingBucket(16), 'watch')
    assert.equal(agingBucket(30), 'watch')
    assert.equal(agingBucket(31), 'overdue')
    assert.equal(agingBucket(60), 'overdue')
    assert.equal(agingBucket(61), 'critical')
  })
})

describe('isBillOverdue', () => {
  it('SUBMITTED >15 days is overdue', () => {
    const sixteen = new Date(Date.now() - 16 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      isBillOverdue({ status: 'SUBMITTED', submittedDate: sixteen, certifiedDate: null }),
      true,
    )
  })

  it('CERTIFIED >30 days is overdue', () => {
    const thirtyOne = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      isBillOverdue({ status: 'CERTIFIED', submittedDate: null, certifiedDate: thirtyOne }),
      true,
    )
  })

  it('PAID is never overdue', () => {
    const ages = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      isBillOverdue({ status: 'PAID', submittedDate: ages, certifiedDate: ages }),
      false,
    )
  })
})
