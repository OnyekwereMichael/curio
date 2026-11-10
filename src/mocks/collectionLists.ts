export interface WordListFixture {
  id: string;
  name: string;
  count: number;
}

// Fixture only — see docs/BACKEND_TODO.md. User-created word lists have no
// backend table yet.
export const MOCK_WORD_LISTS: WordListFixture[] = [
  { id: 'weekend-vocab', name: 'Weekend vocab', count: 8 },
  { id: 'work-emails', name: 'For work emails', count: 5 },
  { id: 'book-club', name: 'Book club words', count: 12 },
];
