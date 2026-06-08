#!/usr/bin/env node
/**
 * Bee ERP — Fingerprint Device Bridge Agent
 * --------------------------------------------------------------------------
 * Runs on the office PC/server that can reach the ZKTeco (or compatible)
 * fingerprint terminal over the LAN. It pulls attendance scans from the device
 * and forwards each one to the Bee ERP webhook, which marks the employee in/out.
 *
 * The browser cannot talk to USB/LAN fingerprint hardware directly — this small
 * agent is the bridge. It only needs outbound HTTPS to the ERP.
 *
 * SETUP
 *   1) cd bridge && npm init -y && npm install zklib-js axios
 *   2) Set the env vars below (or edit the CONFIG block).
 *   3) node zkteco-bridge.js
 *   4) Keep it running (use pm2 / NSSM / Windows Task Scheduler for autostart).
 *
 * ENROLLMENT
 *   In the ERP (Employees → edit → Biometric ID) set each employee's
 *   "biometric id" to the *enrollment number* used on the fingerprint device.
 *   The device sends that number with each scan; the ERP maps it to the user.
 *
 * ENV
 *   ERP_URL            e.g. https://your-backend.railway.app
 *   DEVICE_KEY         must equal BIOMETRIC_DEVICE_KEY in the ERP backend env
 *   DEVICE_IP          fingerprint terminal IP (default 192.168.1.201)
 *   DEVICE_PORT        terminal port (default 4370)
 *   TENANT_ID          optional — only for multi-tenant deployments
 *   POLL_SECONDS       how often to pull new logs (default 15)
 */

const axios = require('axios');
let ZKLib;
try {
  ZKLib = require('zklib-js');
} catch {
  console.error('Missing dependency. Run:  npm install zklib-js axios');
  process.exit(1);
}

const CONFIG = {
  erpUrl: process.env.ERP_URL || 'http://localhost:3000',
  deviceKey: process.env.DEVICE_KEY || 'local_device_key_change_me',
  deviceIp: process.env.DEVICE_IP || '192.168.1.201',
  devicePort: parseInt(process.env.DEVICE_PORT || '4370', 10),
  tenantId: process.env.TENANT_ID || undefined,
  pollSeconds: parseInt(process.env.POLL_SECONDS || '15', 10),
};

const seen = new Set(); // de-dupe scans within a run

async function forwardScan(biometricId, timestamp) {
  const dedupeKey = `${biometricId}@${timestamp}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  try {
    const { data } = await axios.post(
      `${CONFIG.erpUrl}/api/v1/webhooks/biometric`,
      { biometricId: String(biometricId), timestamp, tenantId: CONFIG.tenantId },
      { headers: { 'X-Device-Key': CONFIG.deviceKey }, timeout: 10000 }
    );
    console.log(`✓ ${data.employee || biometricId} → ${data.action} @ ${timestamp}`);
  } catch (err) {
    console.error(`✗ scan ${biometricId}:`, err.response?.data?.error || err.message);
  }
}

async function poll() {
  const zk = new ZKLib(CONFIG.deviceIp, CONFIG.devicePort, 10000, 4000);
  try {
    await zk.createSocket();
    const logs = await zk.getAttendances(); // { data: [{ deviceUserId, recordTime, ... }] }
    const rows = logs?.data || [];
    // Only forward scans from the last poll window to avoid replaying history.
    const cutoff = Date.now() - CONFIG.pollSeconds * 1000 * 4;
    for (const row of rows) {
      const t = new Date(row.recordTime).getTime();
      if (t >= cutoff) {
        await forwardScan(row.deviceUserId, new Date(row.recordTime).toISOString());
      }
    }
  } catch (err) {
    console.error('Device poll error:', err.message);
  } finally {
    try { await zk.disconnect(); } catch { /* ignore */ }
  }
}

console.log(`Bee ERP fingerprint bridge → ${CONFIG.erpUrl}`);
console.log(`Device ${CONFIG.deviceIp}:${CONFIG.devicePort}, polling every ${CONFIG.pollSeconds}s`);
poll();
setInterval(poll, CONFIG.pollSeconds * 1000);
