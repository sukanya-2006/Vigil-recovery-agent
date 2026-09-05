// /**
//  * server/src/services/hinglishRecoveryAgent.js
//  *
//  * AI-powered Hinglish recovery outreach generator.
//  *
//  * Generates a short, natural Hinglish message that a human agent
//  * can send through WhatsApp/SMS or read during a recovery call.
//  *
//  * This service DOES NOT send the message itself.
//  * It only generates the personalized recovery message.
//  *
//  * Required:
//  *   GROQ_API_KEY
//  *
//  * Optional:
//  *   GROQ_MODEL
//  */

// const GROQ_API_KEY = process.env.GROQ_API_KEY;

// // Model available to the current Groq API project.
// const GROQ_MODEL =
//   process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

// const GROQ_URL =
//   'https://api.groq.com/openai/v1/chat/completions';


// function buildPrompt({
//   customerName,
//   amount,
//   failureReason,
//   retryCount,
// }) {
//   const reason = String(failureReason || 'payment issue')
//     .replaceAll('_', ' ')
//     .toLowerCase();

//   return `
// Write ONE short customer-recovery message in natural Indian Hinglish.

// Customer: ${customerName}
// Amount due: ₹${amount}
// Payment issue: ${reason}
// Previous attempts: ${retryCount}

// Rules:
// - Maximum 70 words
// - Use Hindi + English in Roman script
// - Sound like a helpful human payment agent
// - Warm, polite and non-threatening
// - Do not blame the customer
// - Briefly explain the payment issue
// - Give one simple next step
// - If suitable, mention easy installments
// - End with a clear action such as replying YES
// - No markdown
// - No heading
// - No quotation marks
// - Do not explain your answer
// - Return ONLY the final message

// Generate the message now.
// `.trim();
// }


// async function agentic_call_offer_plan({
//   customerName,
//   amount,
//   failureReason,
//   retryCount,
// }) {
//   if (!GROQ_API_KEY) {
//     return {
//       message: null,
//       error: 'GROQ_API_KEY is not set in .env',
//     };
//   }

//   try {
//     const prompt = buildPrompt({
//       customerName,
//       amount,
//       failureReason,
//       retryCount,
//     });

//     console.log(
//       `[hinglishRecoveryAgent] Using model: ${GROQ_MODEL}`
//     );

//     const res = await fetch(GROQ_URL, {
//       method: 'POST',

//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${GROQ_API_KEY}`,
//       },

//       body: JSON.stringify({
//         model: GROQ_MODEL,

//         messages: [
//           {
//             role: 'user',
//             content: prompt,
//           },
//         ],

//         temperature: 0.7,

//         // Qwen supports non-thinking mode.
//         // This prevents unnecessary reasoning for a simple message.
//         reasoning_effort: 'none',

//         // Return only the final customer-facing response.
//         reasoning_format: 'hidden',

//         max_completion_tokens: 180,
//       }),
//     });

//     if (!res.ok) {
//       const errBody = await res.text().catch(() => '');

//       throw new Error(
//         `Groq API ${res.status}: ${errBody.slice(0, 700)}`
//       );
//     }

//     const data = await res.json();

//     const choice = data?.choices?.[0];

//     if (!choice) {
//       throw new Error(
//         `Groq returned no choices. Raw response: ${JSON.stringify(data).slice(0, 1000)}`
//       );
//     }

//     console.log(
//       `[hinglishRecoveryAgent] finish_reason: ${choice.finish_reason}`
//     );

//     if (choice.finish_reason === 'length') {
//       throw new Error(
//         'Groq response was truncated. The model reached the completion limit.'
//       );
//     }

//     let text = choice?.message?.content;

//     if (!text) {
//       throw new Error(
//         `Groq returned no message text. Raw response: ${JSON.stringify(data).slice(0, 1000)}`
//       );
//     }

//     text = String(text).trim();

//     // Remove accidental formatting.
//     text = text
//       .replace(/^["']|["']$/g, '')
//       .replace(/^message:\s*/i, '')
//       .trim();

//     if (!text) {
//       throw new Error(
//         'Groq response was empty after cleanup.'
//       );
//     }

//     return {
//       message: text,
//       model: GROQ_MODEL,
//     };

//   } catch (err) {
//     console.error(
//       '[hinglishRecoveryAgent] Groq call failed:',
//       err.message
//     );

//     return {
//       message: null,
//       error: err.message,
//     };
//   }
// }


// module.exports = {
//   agentic_call_offer_plan,
// };


/**
 * server/src/services/hinglishRecoveryAgent.js
 *
 * AI-powered Hinglish recovery outreach generator.
 *
 * Generates a short, natural Hinglish message that a human agent
 * can send through WhatsApp/SMS or read during a recovery call.
 *
 * This service DOES NOT send the message itself.
 * It only generates the personalized recovery message.
 *
 * Required:
 *   GROQ_API_KEY
 *
 * Optional:
 *   GROQ_MODEL
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Model available to the current Groq API project.
const GROQ_MODEL =
  process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

const GROQ_URL =
  'https://api.groq.com/openai/v1/chat/completions';

function buildPrompt({
  customerName,
  amount,
  failureReason,
  retryCount,
}) {
  const reason = String(failureReason || 'payment issue')
    .replaceAll('_', ' ')
    .toLowerCase();

  return `
Write ONE short customer-recovery message in natural Indian Hinglish.

Customer: ${customerName}
Amount due: ₹${amount}
Payment issue: ${reason}
Previous attempts: ${retryCount}

Rules:
- Maximum 70 words
- Use Hindi + English in Roman script
- Sound like a helpful human payment agent
- Warm, polite and non-threatening
- Do not blame the customer
- Briefly explain the payment issue
- Give one simple next step
- If suitable, mention easy installments
- End with a clear action such as replying YES
- No markdown
- No heading
- No quotation marks
- Do not explain your answer
- Return ONLY the final message

Generate the message now.
`.trim();
}

async function agentic_call_offer_plan({
  customerName,
  amount,
  failureReason,
  retryCount,
}) {
  if (!GROQ_API_KEY) {
    return {
      message: null,
      error: 'GROQ_API_KEY is not set in .env',
    };
  }

  try {
    const prompt = buildPrompt({
      customerName,
      amount,
      failureReason,
      retryCount,
    });

    console.log(
      `[hinglishRecoveryAgent] Using model: ${GROQ_MODEL}`
    );

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],

        temperature: 0.7,

        // Qwen supports non-thinking mode.
        // This avoids unnecessary reasoning for a simple message.
        reasoning_effort: 'none',

        // Return only the final customer-facing response.
        reasoning_format: 'hidden',

        max_completion_tokens: 180,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');

      throw new Error(
        `Groq API ${res.status}: ${errBody.slice(0, 700)}`
      );
    }

    const data = await res.json();

    const choice = data?.choices?.[0];

    if (!choice) {
      throw new Error(
        `Groq returned no choices. Raw response: ${JSON.stringify(data).slice(
          0,
          1000
        )}`
      );
    }

    console.log(
      `[hinglishRecoveryAgent] finish_reason: ${choice.finish_reason}`
    );

    if (choice.finish_reason === 'length') {
      throw new Error(
        'Groq response was truncated. The model reached the completion limit.'
      );
    }

    let text = choice?.message?.content;

    if (!text) {
      throw new Error(
        `Groq returned no message text. Raw response: ${JSON.stringify(data).slice(
          0,
          1000
        )}`
      );
    }

    text = String(text).trim();

    // Remove accidental formatting.
    text = text
      .replace(/^["']|["']$/g, '')
      .replace(/^message:\s*/i, '')
      .trim();

    if (!text) {
      throw new Error(
        'Groq response was empty after cleanup.'
      );
    }

    return {
      message: text,
      model: GROQ_MODEL,
    };
  } catch (err) {
    console.error(
      '[hinglishRecoveryAgent] Groq call failed:',
      err.message
    );

    return {
      message: null,
      error: err.message,
    };
  }
}

module.exports = {
  agentic_call_offer_plan,
};