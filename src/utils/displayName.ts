// utils/displayName.ts
export function getDisplayName(
  createdBy: { id: string; displayName: string } | null | undefined,
  currentUser: { id: string } | null | undefined,
): string {
  if (!createdBy) return '—';
  if (currentUser && createdBy.id === currentUser.id) return 'Me';
  return createdBy.displayName;
}