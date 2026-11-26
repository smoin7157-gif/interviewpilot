/** Stable anchor id for a FAQ question (used on /faq and in-product deep links). */
export function faqEntryId(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}