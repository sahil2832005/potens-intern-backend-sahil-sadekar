import { GENESIS_HASH } from '../config/constants.js';
import { computeEntryHash } from '../lib/hash-chain.js';
import { prisma } from '../lib/prisma.js';

export function formatLogEntry(entry) {
  return {
    id: entry.id.toString(),
    actor: entry.actor,
    action: entry.action,
    payload: entry.payload,
    prevHash: entry.prevHash,
    entryHash: entry.entryHash,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function appendLog({ actor, action, payload }) {
  const createdAt = new Date();

  const entry = await prisma.$transaction(async (tx) => {
    const lastEntry = await tx.logEntry.findFirst({
      orderBy: { id: 'desc' },
      select: { entryHash: true },
    });

    const prevHash = lastEntry?.entryHash ?? GENESIS_HASH;
    const entryHash = computeEntryHash({
      actor,
      action,
      payload,
      createdAt,
      prevHash,
    });

    return tx.logEntry.create({
      data: {
        actor,
        action,
        payload,
        prevHash,
        entryHash,
        createdAt,
      },
    });
  });

  return formatLogEntry(entry);
}
