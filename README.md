# Bom Worldsmith Studio

Tạo một ứng dụng làm game 3D trên web mang tên "Bờm Studio" với giao diện tối ưu cho màn hình ngang (landscape), phong cách tối giản, hiện đại giống Roblox Studio. Sử dụng thư viện Three.js (hoặc React Three Fiber) để dựng môi trường 3D.



1. MÀN HÌNH CHÀO MỪNG (SPLASH / HOME SCREEN):

- Hiển thị ngay khi vào ứng dụng ở chế độ màn hình ngang.

- Tiêu đề lớn ở giữa: "Chào mừng đến với Bờm Studio Update 1.0".

- Nút chính bên dưới tiêu đề: "Tạo dự án".

- Khu vực "Dự án đã lưu": Nếu người dùng đã từng bấm nút Lưu trước đó, hiển thị danh sách dự án lưu trong LocalStorage để bấm vào là mở lại màn hình chỉnh sửa game ngay.



2. BỐ CỤC GIAO DIỆN CHÍNH (STUDIO EDITOR):

Chia màn hình ngang thành 3 cột rõ ràng:

- Cột trái (Nhỏ - Cửa hàng Model Free): Danh sách các nút bấm tạo vật thể.

- Cột giữa (Lớn nhất - Màn hình Viewport 3D): Hiển thị thế giới 3D có mặt đất phẳng (baseplate), bầu trời, ánh sáng và nhân vật người chơi mặc định (100 máu).

- Cột phải (Nhỏ - Bảng điều khiển & Code): Chứa các nút chức năng quản lý và lập trình.



3. CHI TIẾT CỘT TRÁI (CỬA HÀNG MODEL FREE):

Gồm các nút bấm để thêm vật thể vào giữa màn hình 3D hiện tại:

- Cây táo: Tạo mô hình 3D cây xanh có quả đỏ.

- Nhà: Tạo mô hình 3D ngôi nhà cơ bản có mái.

- Đường: Tạo một đoạn đường phẳng màu xám.

- Bụi cây: Tạo cụm lá xanh thấp.

- Kiếm: Tạo mô hình thanh kiếm nằm trên đất (mặc định sát thương là 10).



4. TƯƠNG TÁC VẬT THỂ TRONG MÀN HÌNH 3D (CHẾ ĐỘ CHỈNH SỬA):

- Điều khiển góc nhìn: Hỗ trợ xoay camera bằng chuột/cảm ứng và có cụm nút điều hướng góc nhìn (Tiến, Lùi, Trái, Phải, Lên, Xuống) ở góc màn hình.

- Chọn vật thể: Khi bấm/chạm giữ vào bất kỳ vật thể nào trong màn hình 3D, vật thể đó được chọn và hiển thị một thanh công cụ nổi gồm các nút:

  + "Di chuyển / Kéo dài": Cho phép kéo thay đổi vị trí hoặc kéo giãn kích thước vật thể theo các trục.

  + "Chỉnh to": Phóng to vật thể.

  + "Xóa": Xóa vật thể khỏi màn hình.

  + Nút "X" (Đóng): Xác nhận giữ nguyên vị trí, hình dạng hiện tại và tắt thanh công cụ chỉnh sửa. (Áp dụng cho mọi vật thể và Part).



5. CHI TIẾT CỘT PHẢI (CHỨC NĂNG & HỆ THỐNG CODE):

- Nút "Play": Chuyển sang chế độ chơi thử. Người chơi điều khiển nhân vật bằng phím WASD hoặc Joystick ảo trên màn hình.

  + Cơ chế nhặt kiếm: Khi nhân vật đi chạm vào Kiếm trên đất, kiếm tự động gắn vào tay nhân vật. Trên màn hình chơi thử hiện thêm 2 nút hành động: "Chém" (vung kiếm gây sát thương lên người chơi khác hoặc NPC đứng gần) và "Thả" (vứt kiếm xuống đất tại vị trí hiện tại và ẩn 2 nút hành động).

  + Thanh máu: Mọi nhân vật và NPC đều có thanh máu hiển thị trên đầu (mặc định 100 HP). Khi máu về 0 thì biến mất.

- Nút "Stop": Thoát chế độ chơi thử, đưa mọi vật thể và máu nhân vật về trạng thái ban đầu trước khi bấm Play.

- Nút "Lưu": Lưu toàn bộ trạng thái vật thể, vị trí, kích thước, màu sắc và chỉ số hiện tại vào LocalStorage.

- Nút "Tạo Part": Tạo một khối hộp 3D cơ bản. Khi chọn Part này sẽ có đầy đủ nút (Kéo dài, Chỉnh to, Xóa, X) giống vật thể thường, và có thêm nút "Chỉnh màu" (mở bảng chọn màu sắc để đổi màu khối hộp).

- Nút "Code" (Quản lý thuộc tính vật liệu):

  + Khi bấm vào sẽ mở một cửa sổ dạng bảng trình soạn thảo văn bản (text editor) liệt kê tự động tất cả vật thể đang có trong game theo cú pháp:

    nhà model 1

    cây model 1

    cây model 2

    kiếm model 1 <dame 10>

  + Cho phép người dùng sửa trực tiếp số trong thẻ `<dame ...>` (ví dụ đổi thành `kiếm model 1 <dame 123>`). Khi đóng bảng, sát thương của thanh kiếm đó trong game sẽ cập nhật thành 123.

- Nút "Code Game" (Tạo đối tượng & AI bằng lệnh):

  + Khi bấm vào sẽ mở một cửa sổ nhập văn bản kèm nút "Chạy Code".

  + Hỗ trợ phân tích cú pháp (parser) theo đúng định dạng sau:

    1) Tạo NPC Dân thường (tự động đi lang thang ngẫu nhiên quanh bản đồ):

    -tạo một npc-máu [số máu, ví dụ: 100]

    -dân thường



    2) Tạo NPC Quái vật (tự động đuổi theo và tấn công người chơi khi ở chế độ Play):

    -tạo một npc-máu [số máu, ví dụ: 200]

    -quái vật

    +[số dame, ví dụ: 5] dame



    3) Tạo vật thể thường bằng code (không có hiệu ứng AI hay sát thương):

    Cho phép gõ lệnh tạo nhanh như `-tạo nhà`, `-tạo cây táo`, `-tạo đường`, `-tạo bụi cây` để sinh ra vật thể tương ứng trên bản đồ.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bom-worldsmith-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8da3aacb-f5f1-49cf-b927-639090aeaff8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
