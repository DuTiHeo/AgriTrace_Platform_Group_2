import type { LogNote } from './farming-log.service';

// Existing note API stores the assessment. This convention does not change task status or note.resolved.
export const reviewContent = (value: 'passed' | 'rejected') => value === 'passed' ? 'Đánh giá: Đạt' : 'Đánh giá: Không đạt';
export function latestReview(notes: LogNote[]) {
  const note = notes.filter(n => n.content === reviewContent('passed') || n.content === reviewContent('rejected'))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  return note ? { review: note.content === reviewContent('passed') ? 'passed' as const : 'rejected' as const, reviewedBy: note.leader_name ?? 'Người quản lý' } : {};
}
