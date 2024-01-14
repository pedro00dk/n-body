const expRandom = (rate = 1) => -Math.log(Math.random()) / rate

const scale = (v: number, from0 = 0, from1 = 1, to0 = 0, to1 = 1) => ((v - from0) / (from1 - from0)) * (to1 - to0) + to0

export const generateCloud = (bodies: number, massAlg: 'const' | 'random' | 'exp', massFactor: number) => {
    const velocities = new Float32Array(bodies * 4)
    const positions = new Float32Array(bodies * 4)
    const generateMass = {
        const: () => massFactor,
        random: () => Math.random() * massFactor,
        exp: () => scale(expRandom(massFactor), 0, 5, 0.1, 20),
    }[massAlg]
    for (let i = 0; i < positions.length; i += 4) {
        velocities[i + 0] = Math.random() * 2 - 1
        velocities[i + 1] = Math.random() * 2 - 1
        velocities[i + 2] = Math.random() * 2 - 1
        velocities[i + 3] = 0
        positions[i + 0] = Math.random() * 2 - 1
        positions[i + 1] = Math.random() * 2 - 1
        positions[i + 2] = Math.random() * 2 - 1
        positions[i + 3] = generateMass()
    }
    return { positions, velocities }
}
