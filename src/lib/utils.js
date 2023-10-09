export const ticksToTime = (ticks) => {
    const totalSeconds = ~~(ticks / 10000000)
    const totalMinutes = ~~(totalSeconds / 60)
    const hours = ~~(totalMinutes / 60)

    const remainderMinutes = totalMinutes - hours * 60
    const remainderSeconds = totalSeconds - totalMinutes * 60

    const format = (value) => {
        return value < 10 ? `0${value}` : value
    }

    if (hours > 0) {
        return `${hours}:${format(remainderMinutes)}:${format(
            remainderSeconds
        )}`
    } else {
        return `${remainderMinutes}:${format(remainderSeconds)}`
    }
}
