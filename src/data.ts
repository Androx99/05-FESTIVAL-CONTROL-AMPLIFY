export type EventStatus = 'CONFIRMED' | 'DELAYED' | 'CANCELLED';
export type FestivalEvent = { id: string; artist: string; space: string; time: string; status: EventStatus };
export const initialEvents: FestivalEvent[] = [
  { id: 'EVT-101', artist: 'NEON WAVES', space: 'MAIN STAGE', time: '22:30', status: 'CONFIRMED' },
  { id: 'EVT-102', artist: 'MIDNIGHT SESSION', space: 'GARDEN', time: '23:15', status: 'DELAYED' },
  { id: 'EVT-103', artist: 'ELECTRIC SUNSET', space: 'MAIN STAGE', time: '20:15', status: 'CONFIRMED' },
  { id: 'EVT-104', artist: 'BASS THEORY', space: 'WAREHOUSE', time: '00:30', status: 'CONFIRMED' },
  { id: 'EVT-105', artist: 'DOWN BY THE RIVEEER', space: 'RIVER STAGE', time: '12:00', status: 'DELAYED' },
];
