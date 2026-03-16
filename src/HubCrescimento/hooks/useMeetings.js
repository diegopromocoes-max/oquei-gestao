import { useEffect, useState } from 'react';
import { listenMeetings } from '../services/meetingService';

export function useMeetings(cityId) {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const unsub = listenMeetings({ cityId, callback: setMeetings });
    return () => unsub && unsub();
  }, [cityId]);

  return meetings;
}
