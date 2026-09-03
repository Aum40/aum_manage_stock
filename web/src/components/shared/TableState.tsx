/**
 * แถวสถานะของตาราง (กำลังโหลด / ผิดพลาด / ไม่มีข้อมูล)
 * แยกออกมาเพราะทุกตารางที่ต่อ api ต้องมีครบสามสถานะเหมือนกันหมด
 */
export default function TableState({
  colSpan,
  isLoading,
  error,
  isEmpty,
  loadingLabel,
  emptyLabel,
}: {
  colSpan: number;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  loadingLabel: string;
  emptyLabel: string;
}) {
  if (!isLoading && !error && !isEmpty) return null;

  const message = isLoading
    ? loadingLabel
    : error
      ? error.message
      : emptyLabel;

  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`px-5 py-8 text-center text-sm ${
          error ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {message}
      </td>
    </tr>
  );
}
