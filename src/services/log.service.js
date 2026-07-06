import { GENESIS_HASH } from '../config/constants.js';
import { computeEntryHash, verifyChainLink, verifyEntryHash } from '../lib/hash-chain.js';
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

export async function getLogById(id) {
  const entry = await prisma.logEntry.findUnique({
    where: { id: BigInt(id) },
  });

  if (!entry) {
    const err = new Error(`Log entry ${id} not found`);
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const previousEntry = await prisma.logEntry.findFirst({
    where: { id: { lt: entry.id } },
    orderBy: { id: 'desc' },
  });

  const { hashValid } = verifyEntryHash(entry);
  const { chainValid } = verifyChainLink(entry, previousEntry);

  return {
    ...formatLogEntry(entry),
    verification: {
      hashValid,
      chainValid,
      verified: hashValid && chainValid,
    },
  };
}
