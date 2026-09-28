import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card, Chip, Screen, s } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';
import { useAuth } from '@/contexts/auth-context';
import { listPlots, type Plot } from '@/sevices/farming-log.service';
import { colors } from '@/styles/theme';

export default function AreasScreen() {
  const { accessToken } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!accessToken) { setLoading(false); return; }
    setLoading(true); setError('');
    void listPlots(accessToken)
      .then(result => { if (active) setPlots(result); })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được vùng trồng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  return (
    <Screen title="Vùng trồng quản lý" back>
      <Text style={s.muted}>Danh sách vùng trồng để lựa chọn khi giao việc.</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Feedback text={error} />
      {!loading && !error && !plots.length ? <Text style={s.muted}>Chưa có vùng trồng đang hoạt động.</Text> : null}
      {plots.map(plot => (
        <Card key={plot.plot_id}>
          <View style={s.row}>
            <Text style={{ fontSize: 24 }}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.section}>{plot.code}</Text>
              <Text style={s.muted}>{plot.current_crop_name || 'Chưa có cây trồng hiện tại'}</Text>
            </View>
            <Chip text={plot.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
