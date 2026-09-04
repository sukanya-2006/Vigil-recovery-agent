// Every fetch call to the backend goes through here -- one place to
// change the base URL later (e.g. when deploying), instead of hunting
// through every component for a hardcoded localhost address.
const BASE_URL = 'http://localhost:4000/api';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSummary: () => request('/summary'),
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/transactions${query ? `?${query}` : ''}`);
  },
  getTransaction: (id) => request(`/transactions/${id}`),
  getAudit: (limit = 100) => request(`/audit?limit=${limit}`),
  runAgent: () => request('/agent/run', { method: 'POST' }),
  generateMessage: (id) => request(`/agent/message/${id}`, { method: 'POST' }),
  reviewTransaction: (id, decision) =>
    request(`/agent/review/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  simulateDemoPayment: ({ cardNumber, amount, customerName }) =>
    request('/demo/simulate', {
      method: 'POST',
      body: JSON.stringify({ cardNumber, amount, customerName }),
    }),
};