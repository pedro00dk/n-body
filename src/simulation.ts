/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />
import nbodyBfShaderSource from './shaders/nbody-bf.compute.wgsl?raw'
import nbodyOptShaderSource from './shaders/nbody-opt.compute.wgsl?raw'
import nbodyRenderSource from './shaders/nbody.render.wgsl?raw'

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

/**
 * Exponential distribution random variate generator using the given `rate` inverse scale parameter.
 */
const expRandom = (rate = 1) => -Math.log(Math.random()) / rate

/**
 * Scale a `v` from the [`from0`, `from1`] range to the [`to0`, `to1`] range.
 */
const scale = (v: number, from0 = 0, from1 = 1, to0 = 0, to1 = 1) => ((v - from0) / (from1 - from0)) * (to1 - to0) + to0

export const generateCloud = (count: number) => {
    const velocities = new Float32Array(count * 4)
    const positions = new Float32Array(count * 4)
    const counts = {}
    for (let i = 0; i < positions.length; i += 4) {
        const mass = scale(expRandom(2), 0, 5, 0.1, 20)
        velocities[i + 0] = Math.random() * 2 - 1
        velocities[i + 1] = Math.random() * 2 - 1
        velocities[i + 2] = Math.random() * 2 - 1
        velocities[i + 3] = 0
        positions[i + 0] = Math.random() * 2 - 1
        positions[i + 1] = Math.random() * 2 - 1
        positions[i + 2] = Math.random() * 2 - 1
        positions[i + 3] = 1
    }
    console.log(counts)
    return { positions, velocities }
}

export const renderWebgpu = async (element: HTMLCanvasElement, cloud: ReturnType<typeof generateCloud>) => {
    const adapter = (await navigator.gpu.requestAdapter())!
    const device = await adapter.requestDevice({})
    const context = element.getContext('webgpu')!
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    const nbodyRenderShaderModule = device.createShaderModule({ code: nbodyRenderSource })
    const nbodyBfShaderModule = device.createShaderModule({ code: nbodyBfShaderSource })
    const nbodyOptShaderModule = device.createShaderModule({ code: nbodyOptShaderSource })
    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: nbodyRenderShaderModule,
            entryPoint: 'vs',
            buffers: [
                {
                    stepMode: 'instance',
                    arrayStride: 16,
                    attributes: [{ shaderLocation: 0, format: 'float32x4', offset: 0 }],
                },
            ],
        },
        fragment: {
            module: nbodyRenderShaderModule,
            entryPoint: 'fs',
            targets: [{ format }],
        },
        primitive: {
            topology: 'triangle-list',
        },
    })
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: nbodyBfShaderModule, entryPoint: 'cs' },
    })
    const velocityBuffer = device.createBuffer({
        size: cloud.velocities.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    let positionInBuffer = device.createBuffer({
        size: cloud.velocities.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    })
    let positionOutBuffer = device.createBuffer({
        size: cloud.velocities.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    })
    device.queue.writeBuffer(velocityBuffer, 0, cloud.velocities)
    device.queue.writeBuffer(positionInBuffer, 0, cloud.positions)

    return () => {
        element.width = element.clientWidth
        element.height = element.clientHeight
        const view = context.getCurrentTexture().createView()
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{ view, clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }],
        }
        const bindGroup = device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: positionInBuffer } },
                { binding: 1, resource: { buffer: positionOutBuffer } },
                { binding: 2, resource: { buffer: velocityBuffer } },
            ],
        })

        const encoder = device.createCommandEncoder()
        const computePass = encoder.beginComputePass(renderPassDescriptor)
        computePass.setPipeline(computePipeline)
        computePass.setBindGroup(0, bindGroup)
        computePass.dispatchWorkgroups(1000, 1, 1)
        computePass.end()
        const renderPass = encoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderPipeline)
        // pass.setBindGroup(0, bindGroup)
        renderPass.setVertexBuffer(0, positionInBuffer)
        renderPass.draw(6, cloud.positions.length / 4)
        renderPass.end()
        device.queue.submit([encoder.finish()])
        ;[positionInBuffer, positionOutBuffer] = [positionOutBuffer, positionInBuffer]
    }
}
