const taskTypeLabels: Record<string, string> = {
  tuoi_nuoc: 'Tưới nước',
  bon_phan: 'Bón phân',
  lam_gian: 'Làm giàn',
  lam_co: 'Làm cỏ',
  phun_thuoc: 'Phun thuốc',
  gieo_trong: 'Gieo trồng',
  kiem_tra_sau_benh: 'Kiểm tra sâu bệnh',
  thu_hoach: 'Thu hoạch',
  tia_canh: 'Tỉa cành',
  bao_cao_su_co: 'Báo cáo sự cố',
};

export function getTaskTypeLabel(value: string): string {
  const key = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(taskTypeLabels, key) ? taskTypeLabels[key] : value;
}
