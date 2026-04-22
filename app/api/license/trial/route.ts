import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TRIAL_DAYS = 15

export async function GET() {
  const licenseSetting = await prisma.settings.findUnique({ where: { key: 'licenseToken' } })
  
  // If licensed, no trial
  if (licenseSetting?.value) {
    return NextResponse.json({ isTrial: false, daysLeft: null, tier: 'licensed' })
  }

  const trialStartSetting = await prisma.settings.findUnique({ where: { key: 'trialStart' } })
  
  if (!trialStartSetting?.value) {
    // No trial started yet — auto-start
    const now = new Date().toISOString()
    await prisma.settings.upsert({
      where: { key: 'trialStart' },
      update: { value: now },
      create: { key: 'trialStart', value: now },
    })
    return NextResponse.json({ isTrial: true, daysLeft: TRIAL_DAYS, tier: 'trial', startDate: now })
  }

  const startDate = new Date(trialStartSetting.value)
  const daysUsed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed)

  if (daysLeft <= 0) {
    return NextResponse.json({ isTrial: false, daysLeft: 0, tier: 'expired' })
  }

  return NextResponse.json({ isTrial: true, daysLeft, tier: 'trial', startDate: trialStartSetting.value })
}