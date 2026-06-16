export const API_ROUTES = {
  completeSignup: { method: 'POST', path: '/auth/complete-signup' },
  me: { method: 'GET', path: '/me' },
  createItem: { method: 'POST', path: '/items' },
  rescanItem: (itemId: string) => ({ method: 'POST', path: `/items/${itemId}/scan` }),
  finalizeRecipient: (itemId: string) => ({
    method: 'POST',
    path: `/items/${itemId}/finalize-recipient`,
  }),
  expressInterest: (itemId: string) => ({
    method: 'POST',
    path: `/items/${itemId}/interests`,
  }),
  withdrawInterest: (itemId: string, charityId: string) => ({
    method: 'DELETE',
    path: `/items/${itemId}/interests/${charityId}`,
  }),
  updateWishlist: (charityId: string) => ({
    method: 'PUT',
    path: `/charities/${charityId}/wishlist`,
  }),
  approveCharity: (charityId: string) => ({
    method: 'POST',
    path: `/admin/charities/${charityId}/approve`,
  }),
  rejectCharity: (charityId: string) => ({
    method: 'POST',
    path: `/admin/charities/${charityId}/reject`,
  }),
  pendingCharities: { method: 'GET', path: '/admin/charities/pending' },
  geocode: { method: 'GET', path: '/geocode' },
  expireInterestWindows: { method: 'POST', path: '/jobs/expire-interest-windows' },
} as const;
