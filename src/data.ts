export const eventStatuses = ['CONFIRMED', 'DELAYED', 'CANCELLED'] as const;
export type EventStatus = (typeof eventStatuses)[number];
export type FestivalEvent = {
  id: string;
  code: string;
  artist: string;
  space: string;
  time: string;
  status: EventStatus;
};
