/**
 * RemoteJobsPK → Google Sheet CRM + welcome mail
 *
 * Setup:
 * 1. Sheet tab name must be Leads
 * 2. Deploy → Manage deployments → Web app
 *    Execute as: Me
 *    Who has access: Anyone
 * 3. LEADS_SHEET_WEBHOOK_URL is the web app URL
 * 4. Project Settings → Script properties → EMAIL_SECRET
 *    must match EMAIL_WEBHOOK_SECRET in the app env.
 *    Lead rows still append when WEBHOOK_SECRET is empty.
 *    Sending mail requires that property. Run authorizeMail once.
 */

var WEBHOOK_SECRET = ""; // optional shared secret for lead rows
var EMAIL_SECRET = ""; // required for action sendEmail
var SHEET_NAME = "Leads";

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (data.action === "sendEmail") {
      var emailSecret = EMAIL_SECRET || (PropertiesService.getScriptProperties().getProperty("EMAIL_SECRET") || "");
      if (!emailSecret || data.secret !== emailSecret) {
        return json({ ok: false, error: "unauthorized" });
      }
      if (!data.to || !data.subject) return json({ ok: false, error: "missing mail fields" });
      var mail = {
        to: String(data.to),
        subject: String(data.subject),
        htmlBody: String(data.html || data.text || ""),
        body: String(data.text || ""),
        name: "RemoteJobsPK",
        replyTo: "hello@remotejobspk.com",
      };
      if (data.logoBase64) {
        mail.inlineImages = {
          logo: Utilities.newBlob(Utilities.base64Decode(data.logoBase64), "image/jpeg", "logo.jpg"),
        };
      }
      MailApp.sendEmail(mail);
      return json({ ok: true });
    }

    if (WEBHOOK_SECRET && data.secret !== WEBHOOK_SECRET) {
      return json({ ok: false, error: "unauthorized" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Event",
        "UserId",
        "Name",
        "Email",
        "Phone",
        "City",
        "State",
        "Qualification",
        "Specialty",
        "Plan",
        "SubscriptionStatus",
        "Notes",
      ]);
    }

    sheet.appendRow([
      data.at || new Date().toISOString(),
      data.event || "",
      data.userId || "",
      data.name || "",
      data.email || "",
      data.phone || "",
      data.city || "",
      data.state || "",
      data.qualification || "",
      data.specialty || "",
      data.plan || "",
      data.subscriptionStatus || "",
      data.notes || "",
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput("RemoteJobsPK leads webhook OK");
}

/** Run once from the editor so MailApp can send as this account. */
function authorizeMail() {
  MailApp.getRemainingDailyQuota();
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
