// Honduras es UTC-6 todo el año. Convierte "2026-11-15" en la medianoche de ese día allá.
export const toHondurasDate = (date: string) =>
  new Date(`${date}T00:00:00-06:00`);
