import { verifyChainLink, verifyEntryHash } from '../lib/hash-chain.js';
import { prisma } from '../lib/prisma.js';

export async function verifyFullChain() {
  const entries = await prisma.logEntry.findMany({
    orderBy: { id: 'asc' },
  });

  let previousEntry = null;

  for (const entry of entries) {
    const { hashValid } = verifyEntryHash(entry);
    const { chainValid } = verifyChainLink(entry, previousEntry);

    if (!hashValid || !chainValid) {
      return {
        valid: false,
        totalEntries: entries.length,
        firstBrokenId: entry.id.toString(),
        reason: hashValid ? 'chain_mismatch' : 'hash_mismatch',
      };
    }

    previousEntry = entry;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    firstBrokenId: null,
  };
}
