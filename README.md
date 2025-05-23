## 🔁  Workflow Diagram

```mermaid
graph TD
  A[📥 Email Inbox]
  A --> B[📨 Fetch Emails<br><sub>imap-simple + mailparser</sub>]

  B --> C[🧹 Clean & Parse Content<br><sub>text, HTML, attachments</sub>]

  C --> D[🧠 AI Categorization<br><sub>@google/generative-ai</sub>]
  D --> E[🗂️ Categorize Email<br><sub>Priority / Marketing / General / Spam</sub>]

  E --> F[🧾 Format Message<br><sub>custom WhatsApp template</sub>]

  F --> G[📲 Send via WhatsApp<br><sub>twilio</sub>]

  G --> H[📊 Log + Archive<br><sub>excelj
---

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

### ✅ Folder Structure (Recommended)

s + dropbox</sub>]



