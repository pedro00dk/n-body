/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

import './index.css'
import nbodyBfShaderSource from './shaders/nbody-bf.compute.wgsl?raw'
import nbodyOptShaderSource from './shaders/nbody-opt.compute.wgsl?raw'
import nbodyRenderSource from './shaders/nbody.render.wgsl?raw'

const generateCloud = (count: number) => {
    const velocities = new Float32Array(count * 4)
    const positions = new Float32Array(count * 4)
    for (let i = 0; i < positions.length; i += 4) {
        velocities[i + 0] = Math.random() * 2 - 1
        velocities[i + 1] = Math.random() * 2 - 1
        velocities[i + 2] = Math.random() * 2 - 1
        velocities[i + 3] = 0
        positions[i + 0] = Math.random() * 2 - 1
        positions[i + 1] = Math.random() * 2 - 1
        positions[i + 2] = Math.random() * 2 - 1
        positions[i + 3] = 1
    }
    return { positions, velocities }
}

const renderWebgpu = async (element: HTMLCanvasElement, cloud: ReturnType<typeof generateCloud>) => {
    const adapter = (await navigator.gpu.requestAdapter())!
    const device = await adapter.requestDevice()
    const context = element.getContext('webgpu')!
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    const nbodyRenderShaderModule = device.createShaderModule({ code: nbodyRenderSource })
    const nbodyBfShaderModule = device.createShaderModule({ code: nbodyBfShaderSource })
    const nbodyOptShaderModule = device.createShaderModule({ code: nbodyOptShaderSource })
    const positionLayout: GPUVertexBufferLayout = {
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }],
        arrayStride: 16,
        stepMode: 'instance',
    }
    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: nbodyRenderShaderModule, entryPoint: 'vs', buffers: [positionLayout] },
        fragment: { module: nbodyRenderShaderModule, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
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
        const view = context.getCurrentTexture().createView()
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{ view, clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }],
        }
        const bindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: positionOutBuffer } },
                { binding: 1, resource: { buffer: positionInBuffer } },
                { binding: 2, resource: { buffer: velocityBuffer } },
            ],
        })

        const encoder = device.createCommandEncoder()
        const pass = encoder.beginRenderPass(renderPassDescriptor)
        pass.setPipeline(renderPipeline)
        pass.setBindGroup(0, bindGroup)
        pass.setVertexBuffer(0, positionInBuffer)
        pass.draw(6, cloud.positions.length / 4)
        pass.end()
        device.queue.submit([encoder.finish()])
    }
}

const canvas = document.querySelector('canvas')!
const draw = await renderWebgpu(canvas, generateCloud(128))
requestAnimationFrame(() => draw())
