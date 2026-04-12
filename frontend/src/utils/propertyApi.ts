// utils/propertyApi.ts
// Utility for property API calls (like/interest, etc.)

export async function likeProperty(propertyId: string, token: string): Promise<{ likes_count: number }> {
  const res = await fetch(`/api/v1/properties/${propertyId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to like property');
  }
  const data = await res.json();
  return { likes_count: data.likes_count ?? 0 };
}
