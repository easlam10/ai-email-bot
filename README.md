## 🔁  Workflow Diagram

```mermaid
graph TD
  A[📥 Email Inbox]
  A --> B[📨 Fetch Emails<br/>imap-simple + mailparser]
  B --> C[🧹 Clean & Parse Content<br/>text, HTML, attachments]
  C --> D[🧠 AI Categorization<br/>@google/generative-ai]
  D --> E[🗂️ Categorize Email<br/>Priority / Marketing / General / Spam]
  E --> F[🧾 Format Message<br/>custom WhatsApp template]
  F --> G[📲 Send via WhatsApp<br/>twilio]
  G --> H[📊 Log + Archive<br/>exceljs + dropbox]

---
```

### 🧩 Tech Stack Summary

| Component                 | Purpose                                      | Library Used                    |
|--------------------------|----------------------------------------------|----------------------------------|
| **Email Fetching**       | Read email inbox                             | `imap-simple`, `mailparser`      |
| **Parsing Content**      | Extract plain text / HTML from emails        | `mailparser`                     |
| **AI Categorization**    | Analyze and label emails                     | `@google/generative-ai`          |
| **Formatting Messages**  | Create WhatsApp-friendly content             | Custom template logic            |
| **WhatsApp Messaging**   | Send messages to users                       | `twilio`                         |
| **Logging & Reports**    | Save to Excel / cloud                        | `exceljs`, `dropbox`             |

---




