export class ResourceCache<T> {
  private entries = new Map<string, { value: T; bytes: number }>();
  private used = 0;
  readonly budget: number;
  private release: (value: T) => void;
  constructor(budget: number, release: (value: T) => void) { this.budget = budget; this.release = release; }
  get(key: string) {
    const entry = this.entries.get(key); if (!entry) return undefined;
    this.entries.delete(key); this.entries.set(key, entry); return entry.value;
  }
  set(key: string, value: T, bytes: number) {
    this.delete(key);
    if (bytes > this.budget) { this.release(value); return; }
    this.entries.set(key, { value, bytes }); this.used += bytes;
    while (this.used > this.budget) this.delete(this.entries.keys().next().value!);
  }
  delete(key: string) {
    const entry = this.entries.get(key); if (!entry) return;
    this.entries.delete(key); this.used -= entry.bytes; this.release(entry.value);
  }
  prune(keep: Set<string>) { for (const key of this.entries.keys()) if (!keep.has(key)) this.delete(key); }
  clear() { for (const key of this.entries.keys()) this.delete(key); }
  get bytes() { return this.used; }
  get size() { return this.entries.size; }
}
