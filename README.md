graph TD
  A[Email Inbox] --> B[imap-simple + mailparser]
  B --> C[Parse Email Subject + Body]
  C --> D[@google/generative-ai]
  D --> E[Categorized as Priority / Marketing / General / Spam]
  E --> F[Format Message]
  F --> G[Send to WhatsApp via Twilio]
