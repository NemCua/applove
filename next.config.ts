import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Cho phép truy cập qua ngrok tunnel lúc dev/test trên điện thoại thật (Web
  // Push bắt buộc cần HTTPS). Domain ngrok đổi mỗi lần mở tunnel mới — cập nhật
  // lại giá trị này nếu tunnel URL thay đổi.
  allowedDevOrigins: ['*.ngrok-free.app'],
};

export default nextConfig;
