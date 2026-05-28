// HƯỚNG DẪN CÀI ĐẶT:
// 1. Tạo một Google Sheet mới, đặt tên Sheet (Trang tính) là "DATA".
// 2. Vào Tiện ích mở rộng (Extensions) -> Apps Script.
// 3. Xóa code cũ, dán toàn bộ đoạn code này vào.
// 4. Bấm Lưu (Save).
// 5. Bấm Triển khai (Deploy) -> Triển khai mới (New deployment).
// 6. Chọn loại: Ứng dụng web (Web app).
// 7. Quyền truy cập (Who has access): Chọn "Bất kỳ ai" (Anyone).
// 8. Bấm Triển khai (Deploy) -> Cấp quyền (Authorize access) nếu được hỏi.
// 9. Copy đường dẫn Web app URL và dán vào phần cài đặt của trò chơi.

const SHEET_NAME = 'DATA';

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

// Xử lý khi Game yêu cầu LẤY dữ liệu về
function doGet(e) {
  try {
    const sheet = getSheet();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Không tìm thấy tab DATA trong Google Sheet' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Lấy tất cả dữ liệu từ cột A
    const data = sheet.getRange('A:A').getValues();
    
    const proverbs = [];
    for (let i = 0; i < data.length; i++) {
      const value = data[i][0] ? data[i][0].toString().trim() : '';
      if (value && value.toLowerCase() !== 'data') {
        proverbs.push(value);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: proverbs }))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// Xử lý khi Game gửi dữ liệu MỚI lên
function doPost(e) {
  try {
    const sheet = getSheet();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Không tìm thấy tab DATA trong Google Sheet' }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // Google Apps Script nhận POST từ trình duyệt tốt nhất dạng text/plain
    const requestData = JSON.parse(e.postData.contents);
    const newProverbs = requestData.proverbs; // Phải là một mảng

    if (!newProverbs || !Array.isArray(newProverbs) || newProverbs.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Dữ liệu gửi lên không đúng định dạng' }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // Lọc bỏ dòng trống
    const rowsToAppend = newProverbs.map(p => [p.trim()]).filter(row => row[0] !== '');

    if (rowsToAppend.length > 0) {
      const lastRow = sheet.getLastRow();
      // Chèn các dòng mới vào cuối cột A
      sheet.getRange(lastRow + 1, 1, rowsToAppend.length, 1).setValues(rowsToAppend);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, added: rowsToAppend.length }))
        .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
