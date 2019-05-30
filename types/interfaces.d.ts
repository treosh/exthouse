declare module 'lighthouse'
declare module 'unzip-crx'
declare module '@gribnoysup/wunderbar'

interface Window {
  __tti: {
    e: Array<{ duration: number }>
  }
  ttiPolyfill: {
    getFirstConsistentlyInteractive(): Promise<number>
  }
}
