export type Plan = 'free' | 'pro';

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Бесплатный',
  pro: 'Полная версия'
};

export const PLAN_FEATURES = {
  free: {
    historyLimit: 2,
    allowHiddenRules: false,
    allowPdf: false,
    allowShare: false,
    allowCompare: false
  },
  pro: {
    historyLimit: 30,
    allowHiddenRules: true,
    allowPdf: true,
    allowShare: true,
    allowCompare: true
  }
};
