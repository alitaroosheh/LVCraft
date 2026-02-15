/** Extract content of USER CODE BEGIN id ... USER CODE END id guard blocks */
export function extractGuardedBlocks(content: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const beginRegex = /\/\*\s*USER\s+CODE\s+BEGIN\s+(\w+)\s*\*\//g;
  const endRegex = /\/\*\s*USER\s+CODE\s+END\s+(\w+)\s*\*\//g;

  let match: RegExpExecArray | null;
  const begins: { id: string; index: number }[] = [];
  while ((match = beginRegex.exec(content)) !== null) {
    const id = match[1];
    if (id) begins.push({ id, index: match.index + match[0].length });
  }
  const ends: { id: string; index: number }[] = [];
  while ((match = endRegex.exec(content)) !== null) {
    const id = match[1];
    if (id) ends.push({ id, index: match.index });
  }

  for (const b of begins) {
    const e = ends.find((x) => x.id === b.id);
    if (e && e.index > b.index) {
      const blockContent = content.slice(b.index, e.index);
      blocks.set(b.id, blockContent.trimEnd());
    }
  }
  return blocks;
}

/** Check for malformed guard markers (BEGIN without END or vice versa) */
export function detectMalformedGuards(content: string): string[] {
  const errors: string[] = [];
  const begins = [...content.matchAll(/\/\*\s*USER\s+CODE\s+BEGIN\s+(\w+)\s*\*\//g)];
  const ends = [...content.matchAll(/\/\*\s*USER\s+CODE\s+END\s+(\w+)\s*\*\//g)];

  const beginIds = new Set(begins.map((m) => m[1]));
  const endIds = new Set(ends.map((m) => m[1]));

  for (const id of beginIds) {
    if (!endIds.has(id)) errors.push(`USER CODE BEGIN ${id} has no matching END`);
  }
  for (const id of endIds) {
    if (!beginIds.has(id)) errors.push(`USER CODE END ${id} has no matching BEGIN`);
  }
  return errors;
}
