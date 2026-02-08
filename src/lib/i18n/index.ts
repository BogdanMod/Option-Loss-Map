import ru from './ru';

const dict = ru;

export type I18nKey = keyof typeof dict;

type Params = Record<string, string | number>;

export function t(key: I18nKey, params?: Params): string {
  const template = dict[key];
  if (!params) return template;
  return Object.entries(params).reduce((acc, [paramKey, value]) => {
    return acc.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
  }, template);
}
