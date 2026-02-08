import { useEffect, useState } from 'react';
import { PLAN_FEATURES, PLAN_LABELS, type Plan } from './plan';

const STORAGE_KEY = 'olm_plan';

const readStoredPlan = (): Plan => {
  if (typeof window === 'undefined') return 'free';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'pro' || stored === 'free') return stored;
  } catch {
    return 'free';
  }
  return 'free';
};

export const usePlan = () => {
  const [plan, setPlanState] = useState<Plan>('free');

  useEffect(() => {
    setPlanState(readStoredPlan());
  }, []);

  const setPlan = (nextPlan: Plan) => {
    setPlanState(nextPlan);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextPlan);
    } catch {
      // ignore
    }
  };

  const features = PLAN_FEATURES[plan];
  const isFree = plan === 'free';
  const isPro = plan === 'pro';

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    features,
    isFree,
    isPro,
    setPlan
  };
};
