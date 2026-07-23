/** True when the category is Cost of Goods Sold (product / inventory costs). */
export function isCogsCategory(name?: string | null): boolean {
    if (!name) return false;
    return name.toLowerCase().includes('cost of goods');
}
