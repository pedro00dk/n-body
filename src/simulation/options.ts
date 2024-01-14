export type Options = {
    // gpu
    powerPreference: GPUPowerPreference
    forceFallbackAdapter: boolean
    workloadSize: number

    // sim
    gConstant: number
    gSoftening: number
    delta: number
    bodies: number

    // state
    paused: boolean
    reset: boolean
}

export const optionsConstraints = Object.freeze({
    powerPreference: ['low-power', 'high-performance'] as const,
    forceFallbackAdapter: [false, true] as const,
    workloadSize: [...Array(9)].map((_, i) => 2 ** i),
    gConstant: { min: 0, max: 1, step: 0.001 },
    gSoftening: { min: 0, max: 1, step: 0.001 },
    delta: { min: 0, max: 1, step: 0.001 },
    bodies: [...Array(13)].map((_, i) => 2 ** (i + 8)),
    paused: [false, true] as const,
    reset: [false, true] as const,
} satisfies { [option in keyof Options]: any })

export const optionsDefaults: Options = Object.freeze({
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
    workloadSize: 64,
    gConstant: 1,
    gSoftening: 1,
    delta: 0.0025,
    bodies: 1024,
    paused: false,
    reset: true,
})
