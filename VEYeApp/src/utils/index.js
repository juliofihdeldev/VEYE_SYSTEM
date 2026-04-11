//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
export const calcCrow = (lat1, lon1, lat2, lon2) => {
  if (lat1 == lat2 && lon1 == lon2) {
    return -1
  }

  var R = 6371 // km
  var dLat = toRad(lat2 - lat1)
  var dLon = toRad(lon2 - lon1)
  var lat1 = toRad(lat1)
  var lat2 = toRad(lat2)

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c
  return d?.toFixed(2) // Rounding to 2 decimal places()
}

// Converts numeric degrees to radians
function toRad(Value) {
  return (Value * Math.PI) / 180
}

export const formatDate = (date, hours = false) => {
  if (!date) return ''
  const d = new Date(date)

  const month = d.getMonth() + 1
  const day = d.getDate()
  const year = d.getFullYear()

  const hour = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  return !hours
    ? `${day}/${month}/${year}`
    : `${day}/${month}/${year} ${hour}:${minutes}:${seconds}`
}

// create a time ago function
export const timeAgo = date => {
  if (!date) return ''
  date = new Date(date)
  const seconds = Math.floor((new Date() - date) / 1000)
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  }

  for (const [interval, secondsInInterval] of Object.entries(intervals)) {
    const count = Math.floor(seconds / secondsInInterval)
    if (count >= 1) {
      return `${count} ${interval}${count > 1 ? 's' : ''} ago`
    }
  }

  return 'just now'
}
