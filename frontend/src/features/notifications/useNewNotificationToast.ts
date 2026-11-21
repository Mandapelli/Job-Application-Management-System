import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUnreadCount } from './hooks';

/**
 * Pops a toast when the unread count goes UP while the app is open (a new reminder arrived).
 * It stays quiet on the first load, so old unread items don't greet you with a toast every visit.
 */
export function useNewNotificationToast() {
  const navigate = useNavigate();
  const { data } = useUnreadCount();
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (data === undefined) return;
    if (previous.current !== undefined && data > previous.current) {
      const added = data - previous.current;
      toast.info(`You have ${added} new notification${added === 1 ? '' : 's'}`, {
        id: 'new-notifications', // replaces an earlier one instead of stacking
        action: { label: 'View', onClick: () => navigate('/notifications') },
      });
    }
    previous.current = data;
  }, [data, navigate]);
}
