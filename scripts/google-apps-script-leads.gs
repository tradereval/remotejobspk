/**
 * RemoteJobsPK → Google Sheet CRM
 *
 * Setup:
 * 1. Create a Google Sheet named "RemoteJobsPK CRM"
 * 2. First row headers (exact):
 *    Timestamp | Event | UserId | Name | Email | Phone | City | State | Qualification | Specialty | Plan | SubscriptionStatus | Notes
 * 3. Extensions → Apps Script → paste this file → Deploy → New deployment → Web app
 *    Execute as: Me
 *    Who has access: Anyone
 * 4. Copy the Web App URL into Render env: LEADS_SHEET_WEBHOOK_URL
 * 5. Optional: set LEADS_SHEET_WEBHOOK_SECRET and match WEBHOOK_SECRET below
 */

var WEBHOOK_SECRET = ""; // optional shared secret
var SHEET_NAME = "Leads"; // tab name

function doPost(e) {
  try {
    if (WEBHOOK_SECRET) {
      var auth = (e && e.parameter && e.parameter.secret) || "";
      var header = "";
      try {
        header = e.postData && e.postData.type ? "" : "";
      } catch (ignore) {}
      // Also accept secret in JSON body
    }

    var data = JSON.parse(e.postData.contents || "{}");
    if (WEBHOOK_SECRET && data.secret !== WEBHOOK_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "unauthorized" })).setMimeType(
        ContentService.MimeType.JSON,
      );
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

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
}

function doGet() {
  return ContentService.createTextOutput("RemoteJobsPK leads webhook OK");
}
