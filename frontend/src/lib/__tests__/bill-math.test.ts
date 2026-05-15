import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeBill,
  billAgingDays,
  agingBucket,
  isBillOverdue,
} from '../bill-math.ts'

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
    assert.equal(r.netAmount, 0)
    assert.ok(!Number.isNaN(r.netAmount))
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
    // 10,00,000 + 1,80,000 − 20,000 − 50,000 − 50,000 − 10,000 = 10,50,000
    assert.equal(r.netAmount, 10_50_000)
  })

  it('rounds floating-point drift cleanly', () => {
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
    assert.equal(r.netAmount, 1_37_037.02)
  })

  it('rejects out-of-range rates', () => {
    assert.throws(() =>
      computeBill({
        grossAmount: 10_00_000,
        gstRate: 60,
        tdsRate: 2,
        retentionRate: 5,
        mobAdvanceRecovery: 0,
        otherDeductions: 0,
      }),
    )
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
})

describe('aging helpers', () => {
  it('billAgingDays returns 0 with no reference date', () => {
    assert.equal(
      billAgingDays({ status: 'draft', submittedDate: null, certifiedDate: null }),
      0,
    )
  })

  it('agingBucket classifies correctly', () => {
    assert.equal(agingBucket(0), 'normal')
    assert.equal(agingBucket(15), 'normal')
    assert.equal(agingBucket(16), 'watch')
    assert.equal(agingBucket(31), 'overdue')
    assert.equal(agingBucket(61), 'critical')
  })

  it('isBillOverdue: SUBMITTED >15d is overdue', () => {
    const sixteen = new Date(Date.now() - 16 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      isBillOverdue({ status: 'submitted', submittedDate: sixteen, certifiedDate: null }),
      true,
    )
  })

  it('isBillOverdue: PAID never overdue', () => {
    const ages = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
    assert.equal(
      isBillOverdue({ status: 'paid', submittedDate: ages, certifiedDate: ages }),
      false,
    )
  })
})
