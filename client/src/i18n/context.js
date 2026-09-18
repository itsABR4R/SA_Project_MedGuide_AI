import { createContext, useContext } from 'react';
import { translate } from './messages.js';

const defaultContext = Object.freeze({
  language: 'en',
  locale: 'en-US',
  setLanguage() {},
  t: (key, parameters) => translate('en', key, parameters),
  formatNumber: (number) => new Intl.NumberFormat('en-US').format(number)
});

export const I18nContext = createContext(defaultContext);

export function useI18n() {
  return useContext(I18nContext);
}
