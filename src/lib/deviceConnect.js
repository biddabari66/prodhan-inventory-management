// Browser device API helpers for the Hardware Configuration page.
// Every function is defensively feature-detected so callers never crash.

/** Feature-detection flags for the various browser hardware APIs. */
export const support = {
  get webhid() {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  },
  get webserial() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  },
  get bluetooth() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },
  get usb() {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  },
  get print() {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  },
};

/**
 * Request a USB HID device (e.g. an advanced barcode scanner that exposes a
 * raw HID interface). Returns the selected device or throws a friendly error.
 */
export async function connectHidScanner() {
  if (!support.webhid) {
    throw new Error('WebHID is not supported in this browser. Try Chrome or Edge on a desktop computer.');
  }
  const devices = await navigator.hid.requestDevice({ filters: [] });
  if (!devices || devices.length === 0) {
    throw new Error('No device was selected.');
  }
  const device = devices[0];
  if (!device.opened) {
    await device.open();
  }
  return device;
}

/**
 * Request a Bluetooth device. Accepts all devices so non-technical users can
 * pick whatever shows up. optionalServices lets us read common GATT services.
 */
export async function connectBluetooth() {
  if (!support.bluetooth) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge on Windows/Android.');
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      'battery_service',
      'device_information',
      '000018f0-0000-1000-8000-00805f9b34fb', // common serial/print service
    ],
  });
  return device;
}

/** Basic IPv4 + optional port validation for biometric device setup. */
export function isValidIp(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

export function isValidPort(port) {
  const n = Number(port);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

const BIOMETRIC_KEY = 'biometric_devices';

/** Load the saved biometric devices list from localStorage. */
export function loadBiometricDevices() {
  try {
    const raw = localStorage.getItem(BIOMETRIC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist the biometric devices list to localStorage. */
export function saveBiometricDevices(devices) {
  try {
    localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(devices || []));
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

/** Resolve the public webhook base URL biometric devices should push to. */
export function getWebhookBaseUrl() {
  const fromEnv = import.meta.env?.VITE_API_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
