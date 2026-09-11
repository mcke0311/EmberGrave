(() => {
  'use strict';
  const link = document.getElementById('donate-link');
  const status = document.getElementById('donation-status');
  const configured = window.EMBERGRAVE_SUPPORT?.donationUrl;
  if (typeof configured !== 'string' || !configured.trim()) return;
  let destination;
  try { destination = new URL(configured); } catch { return; }
  if (destination.protocol !== 'https:' || destination.username || destination.password) return;
  link.href = destination.href;
  status.textContent = `Continue to ${destination.hostname} to choose your contribution and complete payment. Opens in a new tab.`;
  link.hidden = false;
})();
