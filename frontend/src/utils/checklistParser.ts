export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  lineNumber: number;
}

export interface ChecklistParseResult {
  items: ChecklistItem[];
  totalCount: number;
  checkedCount: number;
  progressPercentage: number;
}

/**
 * Parses markdown-style checklist from text
 * Supports: [ ], [], for unchecked, [x] or [X] for checked
 */
export function parseChecklist(text: string): ChecklistParseResult {
  if (!text) {
    return {
      items: [],
      totalCount: 0,
      checkedCount: 0,
      progressPercentage: 0
    };
  }

  const lines = text.split('\n');
  const items: ChecklistItem[] = [];

  // Regex to match checklist items: [ ], [], [x], [X]
  // Matches optional dash/asterisk, then [any single char or empty], then text
  const checklistRegex = /^\s*[-*]?\s*\[([xX\s]?)\]\s*(.+)$/;

  lines.forEach((line, index) => {
    const match = line.match(checklistRegex);
    if (match) {
      const checkMark = match[1];
      const checked = checkMark.toLowerCase() === 'x';
      const text = match[2].trim();

      items.push({
        id: `item-${index}`,
        text,
        checked,
        lineNumber: index
      });
    }
  });

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return {
    items,
    totalCount,
    checkedCount,
    progressPercentage
  };
}

/**
 * Updates the checklist in the original text by toggling a specific item
 */
export function toggleChecklistItem(text: string, itemId: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  const lineNumber = parseInt(itemId.split('-')[1]);

  if (lineNumber >= 0 && lineNumber < lines.length) {
    const line = lines[lineNumber];
    const checklistRegex = /^(\s*[-*]?\s*)\[([xX\s]?)\](\s*.+)$/;
    const match = line.match(checklistRegex);

    if (match) {
      const checkMark = match[2];
      const checked = checkMark.toLowerCase() === 'x';
      // If currently checked, uncheck (use empty string if original was [])
      // If currently unchecked, check with 'x'
      const newCheckmark = checked ? (checkMark === ' ' ? ' ' : '') : 'x';
      lines[lineNumber] = `${match[1]}[${newCheckmark}]${match[3]}`;
    }
  }

  return lines.join('\n');
}

/**
 * Converts plain checklist items to markdown format
 */
export function createChecklistMarkdown(items: string[]): string {
  return items.map(item => `- [ ] ${item}`).join('\n');
}
