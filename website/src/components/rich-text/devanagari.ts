import { Tiro_Devanagari_Sanskrit } from 'next/font/google'

/**
 * Tiro Devanagari Sanskrit, declared only here: its @font-face rules load with the verse
 * component, it is never preloaded, and the browser downloads it only for Devanagari text
 * (website design 7.2; stage 3a plan, before you start).
 */
export const devanagari = Tiro_Devanagari_Sanskrit({
  weight: '400',
  subsets: ['devanagari'],
  preload: false,
  display: 'swap',
})
