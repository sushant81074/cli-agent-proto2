const SEP = "\n\n";
export const estimateTokens = (text: string): number => Math.ceil((text.length / 4) * 1.2);
const tokensOf = (paragraphs: string[]): number => estimateTokens(paragraphs.join(SEP));

/** The last WHOLE paragraphs whose total fits in overlapTokens (readable context, not half a sentence). */
const overlapTail = (paragraphs: string[], overlapTokens: number): string[] => {
    if (overlapTokens <= 0) return [];
    const kept: string[] = [];
    for (let i = paragraphs.length - 1; i >= 0; i--) {
        const p = paragraphs[i] as string;
        if (tokensOf([p, ...kept]) > overlapTokens) break;
        kept.unshift(p);
    }
    return kept;
};

/** Cut one oversized paragraph into pieces, preferring sentence ends. */
const hardSplit = (paragraph: string, chunkTokens: number): string[] => {
    const maxChars = Math.max(1, Math.floor((chunkTokens * 4) / 1.2)); // reverse of estimateTokens
    const pieces: string[] = [];
    let rest = paragraph;

    while (rest.length > maxChars) {
        let cut = rest.lastIndexOf(". ", maxChars);
        cut = cut < maxChars / 2 ? maxChars : cut + 1; // no sentence end nearby → hard cut
        pieces.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }

    if (rest.length > 0) pieces.push(rest);
    return pieces;
};

/**
 * Split text into chunks of ~chunkTokens, cut at paragraph boundaries,
 * each chunk starting with the last paragraph(s) of the previous one (overlap).
 */
export const chunkText = (text: string, chunkTokens: number, overlapTokens: number): string[] => {
    let paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0)
        // A single paragraph bigger than a chunk would break everything, so cut it first.
        .flatMap((p) => (estimateTokens(p) > chunkTokens ? hardSplit(p, chunkTokens) : [p]));

    const chunks: string[] = [];
    let current: string[] = [];

    for (const p of paragraphs) {
        if (current.length > 0 && tokensOf([...current, p]) > chunkTokens) {
            chunks.push(current.join(SEP));
            current = overlapTail(current, overlapTokens);
            // If overlap + this paragraph is still too big, drop the overlap for this boundary.
            if (current.length > 0 && tokensOf([...current, p]) > chunkTokens) current = [];
        }
        current.push(p);
    }


    return [];
};