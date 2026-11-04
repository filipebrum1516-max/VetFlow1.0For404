/** Datas sempre no fuso do computador da clínica (ex.: Rondônia, UTC-4), nunca em UTC. */
export function localISO(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export function localTime(date: Date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
export function localDateTime(date: Date = new Date()) {
  return `${localISO(date)}T${localTime(date)}`
}
