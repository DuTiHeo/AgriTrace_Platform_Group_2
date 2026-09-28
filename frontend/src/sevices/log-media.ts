import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getLog, uploadPhotos, type GPSPoint } from './farming-log.service';

export async function getLogLocation(): Promise<GPSPoint> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Vui lòng cấp quyền vị trí trong cài đặt để ghi nhật ký.');
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Vui lòng bật dịch vụ vị trí / GPS trên thiết bị.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Chưa lấy được GPS. Hãy ra nơi thoáng và thử lại.')), 20000); }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } finally { clearTimeout(timer); }
}

// Encode the image as JPEG; changing its filename alone does not convert HEIC/PNG.
export async function prepareLogPhoto(uri: string): Promise<string> {
  const image = await manipulateAsync(uri, [], { compress: 0.75, format: SaveFormat.JPEG });
  const size = Platform.OS === 'web' ? (await (await fetch(image.uri)).blob()).size
    : await FileSystem.getInfoAsync(image.uri).then(info => info.exists ? info.size : 0);
  if (!size || size > 5 * 1024 * 1024) throw new Error('Ảnh sau khi chuyển sang JPEG phải nhỏ hơn hoặc bằng 5 MB. Hãy chọn ảnh khác.');
  return image.uri;
}

export async function uploadDraftPhotos(token: string, logId: string, photos: string[]) {
  if (!photos.length || photos.length > 5) throw new Error('Mỗi nhật ký được tải từ 1 đến 5 ảnh.');
  const current = await getLog(token, logId);
  // A lost upload response can still mean the whole batch committed. Reconcile before retrying.
  if (current.photos.length === photos.length) return current;
  if (current.photos.length !== 0) throw new Error('Nhật ký đã có ảnh khác. Hãy mở chi tiết để kiểm tra trước khi tải thêm.');
  const form = new FormData();
  for (let i = 0; i < photos.length; i++) {
    const name = `photo-${i + 1}.jpg`;
    if (Platform.OS === 'web') {
      const blob = await (await fetch(photos[i])).blob();
      form.append('files', blob, name);
    } else {
      form.append('files', new File(photos[i]));
    }
  }
  const uploaded = await uploadPhotos(token, logId, form);
  return { ...current, photos: uploaded };
}
