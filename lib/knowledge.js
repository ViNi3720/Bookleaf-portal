export const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

export const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export const TONE_GUIDELINES = `
- Always be empathetic and professional. Authors are our partners, not customers to be managed.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: use the actual numbers, dates and statuses given in the author data. Never invent figures.
- If something is BookLeaf's fault (delayed royalty, ISBN error), own it directly. No corporate deflection.
- If the issue needs escalation or investigation, give a clear timeline such as "Our team will look into this and get back to you within 48 hours". No open-ended promises.
- Always end with a clear next step for the author and/or the BookLeaf team.
- Never blame the author, even if the delay is on their side. Frame it collaboratively.
- Write like a real BookLeaf support team member: warm, direct, no generic AI phrases.
`.trim();

export const CATEGORY_KNOWLEDGE = {
  "Royalty & Payments": `
POLICY
- BookLeaf follows an 80/20 royalty split: 80% of net profit per book goes to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold is Rs. 1,000. If accumulated royalties are below this, they roll over to the next quarter.
- Payouts are made by bank transfer to the account linked in the author's dashboard.
- Authors can view a detailed royalty breakdown in their dashboard, showing sales figures per platform.
HOW TO RESPOND
- No royalty received yet: acknowledge the frustration, explain the quarterly cycle and 45-day payout window, ask them to check that bank details are linked, give the specific next payout date. If genuinely overdue, escalate with a 48-hour resolution timeline.
- Royalty seems too low: explain the net profit calculation (MRP minus printing, platform commission, shipping), offer a detailed line-by-line royalty breakdown, do not be defensive, be transparent.
`.trim(),

  "ISBN & Metadata Issues": `
POLICY
- Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.
- ISBNs are registered under BookLeaf's publisher imprint. If an author wants an ISBN under their own imprint, they must obtain it independently.
- An ISBN error (duplicate, wrong book linked) is treated as a high-priority issue and escalated to the production team.
- Metadata updates (for example a book description on Amazon) can be submitted through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3-5 business days.
HOW TO RESPOND
- ISBN mismatch or error: treat as high priority, acknowledge this is a serious data issue, confirm you are escalating to the production team immediately, give a 48-hour resolution timeline.
`.trim(),

  "Printing & Quality": `
POLICY
- In-house printing (Delhi facility) handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
- Standard print turnaround is 5-7 business days from order confirmation.
- If an author reports a quality issue (misprints, binding defects, colour inconsistency), BookLeaf arranges a free reprint after verification. The author may need to share photos of the defective copy.
HOW TO RESPOND
- Quality complaint: apologise sincerely, ask the author to share photos of the defective copies, confirm BookLeaf will arrange a free reprint once verified, give a 5-7 business day timeline for the reprint.
`.trim(),

  "Distribution & Availability": `
POLICY
- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings typically go live within 7-10 business days after publication is complete.
- If a book shows as unavailable on a platform, it usually indicates a stock sync issue. BookLeaf's team can trigger a re-sync within 24-48 hours.
HOW TO RESPOND
- Book shows "Currently Unavailable": explain it is typically a stock sync issue, confirm you are triggering a re-sync with the distribution team, set the expectation of 24-48 hours for it to go live again.
`.trim(),

  "Book Status & Production Updates": `
POLICY
- A book goes through these stages: Manuscript Received, Editing (if opted), Cover Design, Typesetting, Proofreading, ISBN Assignment, Printing, Distribution Setup, Published & Live.
- Authors are updated at each stage by email.
- Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).
- New listings go live within 7-10 business days after publication is complete.
HOW TO RESPOND
- Production delay question: check the actual production status given in the author data. If it is delayed, be honest about why (for example waiting on author approval for proofs) without blaming the author. Give a specific updated timeline and frame the next step collaboratively.
`.trim(),

  "General Inquiry": `
POLICY
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Publishing packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid, with marketing and distribution add-ons).
- BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management.
- The in-house printing facility and warehouse are in Delhi. Print partners include Repro India and Epitome Books.
- Metadata updates (for example a book description on Amazon after it is live) can be submitted through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3-5 business days.
HOW TO RESPOND
- Answer the question directly using the policy above. If the answer is not covered here, say the team will look into it and give a 48-hour timeline instead of guessing.
`.trim(),
};
