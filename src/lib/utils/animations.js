export const shake = (strength = 1) => {
    return {
        transform: [
            `translateX(-${strength}px)`,
            `translateX(${strength * 2}px)`,
            `translateX(-${strength * 4}px)`,
            `translateX(${strength * 4}px)`,
            `translateX(-${strength * 4}px)`,
            `translateX(${strength * 4}px)`,
            `translateX(-${strength * 4}px)`,
            `translateX(${strength * 2}px)`,
            `translateX(-${strength}px)`,
        ],
        offset: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    }
}

export const spin = (rotations = 1) => {
    return [
        { rotate: '0deg', easing: 'ease-in-out' },
        { rotate: `${rotations * 360}deg`, easing: 'ease-in-out' },
    ]
}
