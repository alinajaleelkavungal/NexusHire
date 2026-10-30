'use client'

import { useRouter } from 'next/navigation'
import OnboardingFlow from '@/components/OnboardingFlow'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    try {
      localStorage.setItem('nexushire_onboarded', 'true')
      sessionStorage.setItem('nexushire_splash_shown', 'true')
    } catch (_) {}
    router.push('/login')
  }

  return <OnboardingFlow onComplete={handleComplete} />
}
