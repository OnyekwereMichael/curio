import { MOCK_WORD_LISTS, type WordListFixture } from '../mocks/collectionLists';

// TODO(backend): replace with a real user-created word_lists table read.
// See docs/BACKEND_TODO.md.
export async function getWordLists(): Promise<WordListFixture[]> {
  await new Promise((r) => setTimeout(r, 100));
  return MOCK_WORD_LISTS;
}
