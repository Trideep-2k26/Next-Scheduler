import { startOfMonth, endOfMonth, addMonths, format } from "date-fns"

export function getThisMonthRange() {
  const now = new Date()
  return { start: now, end: endOfMonth(now) }
}

export function getNextMonthRange() {
  const nextMonth = addMonths(new Date(), 1)
  return { start: startOfMonth(nextMonth), end: endOfMonth(nextMonth) }
}

export function formatMonthRange(monthType) {
  if (monthType === 'next') {
    const range = getNextMonthRange()
    return `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
  } else {
    const range = getThisMonthRange()
    return `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
  }
}

export function getMonthRangeByType(monthType) {
  return monthType === 'next' ? getNextMonthRange() : getThisMonthRange()
}