## 🔁  Workflow Diagram

```mermaid
graph TD
  A[📥 Email Inbox]
  A --> B[📨 Fetch Emails (imap-simple + mailparser)]
  B --> C[🧹 Clean & Parse Content (text, HTML, attachments)]
  C --> D[🧠 AI Categorization (@google/generative-ai)]
  D --> E[🗂️ Categorize Email (Priority / Marketing / General / Spam)]
  E --> F[🧾 Format Message (custom WhatsApp template)]
  F --> G[📲 Send via WhatsApp (twilio, meta)]


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




