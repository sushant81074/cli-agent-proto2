export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {

    const results = new Array(items.length);
    let next = 0;

    async function worker() {
        while (true) {
            let i = next;
            next += 1;
            if (i >= items.length) return;
            const item = items[i];
            if (item === undefined && !(i in items)) return;
            results[i] = await fn(item as T, i);
        }
    };

    let workerCount = Math.max(1, Math.min(limit, items.length));
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    return results;

}