const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  TABLE_NOT_FOUND: "Không tìm thấy bàn.",
  TABLE_BUSY: "Bàn này đang có khách.",
  TABLE_HAS_OPEN_ORDER: "Bàn đang có đơn chưa thanh toán.",
  INVALID_STATUS: "Trạng thái bàn không hợp lệ.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  ORDER_NOT_OPEN: "Đơn đã đóng, không thể chỉnh sửa.",
  ITEM_NOT_FOUND: "Không tìm thấy món.",
  ITEM_UNAVAILABLE: "Món này đang tạm ngừng bán.",
  INVALID_QTY: "Số lượng không hợp lệ.",
  INVALID_DISCOUNT: "Mức giảm giá không hợp lệ.",
  INVALID_NOTE: "Ghi chú quá dài (tối đa 200 ký tự).",
  EMPTY_ORDER: "Đơn chưa có món nào.",
  SAME_ORDER: "Không thể gộp đơn với chính nó.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản.",
  INVALID_ROLE: "Vai trò không hợp lệ.",
  CANNOT_UPDATE_SELF: "Không thể tự hạ quyền hoặc khoá chính mình.",
  MISSING_SERVICE_ROLE_KEY:
    "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên server.",
  INVALID_INPUT: "Dữ liệu nhập chưa hợp lệ.",
  TOO_MANY_ATTEMPTS: "Bạn thử quá nhiều lần. Vui lòng đợi 1 phút.",
};

/** Chuyển lỗi Postgres/Supabase thành thông báo thân thiện, không lộ chi tiết DB. */
export function friendlyError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  for (const [code, message] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return message;
  }

  if (raw.includes("duplicate key")) {
    return "Dữ liệu đã tồn tại (trùng tên hoặc mã).";
  }
  if (raw.includes("violates row-level security")) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (raw.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (raw.includes("Email not confirmed")) {
    return "Email chưa được xác nhận. Liên hệ quản trị viên.";
  }

  return "Có lỗi xảy ra, vui lòng thử lại.";
}
