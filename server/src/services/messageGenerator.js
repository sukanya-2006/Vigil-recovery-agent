// Generates the actual customer-facing message for REMINDER / UPDATE_METHOD
// actions, using Groq. Deliberately isolated from the core agent loop --
// this is called on-demand, one transaction at a time, from a dashboard
// button, never automatically for a whole batch. That keeps it from ever
// slowing down or risking the tested "Run agent" flow.

const MODEL = 'llama-3.1-8b-instant'; // fast + cheap, right-sized for a short message

function fallbackMessage(actionType, customerName, amount) {
  if (actionType === 'UPDATE_METHOD') {
    return `Hi ${customerName}, your recent payment of ₹${amount} didn't go through because your card has expired. Please update your payment method to complete the transaction.`;
  }
  return `Hi ${customerName}, we noticed your payment of ₹${amount} didn't go through. We'll retry shortly, or you can complete it directly from your account.`;
}

async function generateCustomerMessage(transaction, actionType) {
  const customerName = transaction.customer?.name || 'there';
  const amount = transaction.amount;

  if (actionType !== 'REMINDER' && actionType !== 'UPDATE_METHOD') {
    return { message: null, source: 'not-applicable' };
  }

  if (!process.env.GROQ_API_KEY) {
    return { message: fallbackMessage(actionType, customerName, amount), source: 'template (no API key set)' };
  }

  try {
    const prompt = `Write a short, friendly, professional payment message (2-3 sentences, no greeting like "Dear", no subject line) to a customer named ${customerName} whose ₹${amount} payment failed due to: ${transaction.failureReason.replaceAll('_', ' ').toLowerCase()}. ${
      actionType === 'UPDATE_METHOD'
        ? 'Ask them to update their payment method since the card has expired.'
        : 'Let them know we will retry shortly, or invite them to complete the payment themselves.'
    }`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Groq API returned ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return { message: text || fallbackMessage(actionType, customerName, amount), source: 'groq' };
  } catch (err) {
    console.error('Message generation failed, using fallback:', err.message);
    return { message: fallbackMessage(actionType, customerName, amount), source: 'template (API call failed)' };
  }
}

module.exports = { generateCustomerMessage };