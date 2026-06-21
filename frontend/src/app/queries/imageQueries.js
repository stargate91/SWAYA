import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const useImageStatusQuery = () => useQuery({
  queryKey: ['image-status'],
  queryFn: () => api.image.getStatus(),
  refetchInterval: 1500,
});
