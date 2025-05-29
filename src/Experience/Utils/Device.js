export default function isMobileDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }
  