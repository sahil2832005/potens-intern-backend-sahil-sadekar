import { createHash } from 'node:crypto';
import { GENESIS_HASH } from '../config/constants.js';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

  return `{${pairs.join(',')}}`;
}

function normalizeTimestamp(createdAt) {
  if (createdAt instanceof Date) {
    return createdAt.toISOString();
  }

  return new Date(createdAt).toISOString();
}

export function buildCanonicalEntry({ actor, action, payload, createdAt, prevHash }) {
  return stableStringify({
    action,
    actor,
    created_at: normalizeTimestamp(createdAt),
    payload: payload ?? {},
    prev_hash: prevHash,
  });
}

export function computeEntryHash(fields) {
  const canonical = buildCanonicalEntry(fields);
  return createHash('sha256').update(canonical).digest('hex');
}

export function verifyEntryHash(entry) {
  const expectedHash = computeEntryHash({
    actor: entry.actor,
    action: entry.action,
    payload: entry.payload,
    createdAt: entry.createdAt,
    prevHash: entry.prevHash,
  });

  return {
    hashValid: expectedHash === entry.entryHash,
  };
}

export function verifyChainLink(entry, previousEntry) {
  if (!previousEntry) {
    return {
      chainValid: entry.prevHash === GENESIS_HASH,
    };
  }

  return {
    chainValid: entry.prevHash === previousEntry.entryHash,
  };
}