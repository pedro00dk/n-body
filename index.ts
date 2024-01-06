/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

import './index.css'
import heatwaveFragGlsl from './shaders/heatwave.frag.glsl?raw'
import heatwaveWgsl from './shaders/heatwave.wgsl?raw'
import squareVertGlsl from './shaders/square.vert.glsl?raw'

type HeatmapFunction<THeatmap> = (width: number, height: number) => THeatmap

let count = 0
const shift = { r: 0, g: 0, b: 0 }

setInterval(() => {
    shift.r = (Math.sin(count + Math.PI) + 1) / 2
    shift.g = (Math.sin(count + Math.PI * 0.33) + 1) / 2
    shift.b = (Math.sin(count + Math.PI * 0.66) + 1) / 2
    count += 0.05
}, 100)

const generateHeatmap: HeatmapFunction<Uint32Array> = (w, h) => {
    const heatmap = new Uint32Array(w * h)
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const r = shift.r * (x / (w - 1)) * 255
            const g = shift.g * (y / (h - 1)) * 255
            const b = shift.b * 255
            heatmap[x + y * w] = (r >> 0) | (g << 8) | (b << 16) | (255 << 24)
        }
    return heatmap
}

const generateHeatmapStr: HeatmapFunction<string[]> = (w, h) => {
    const heatmap = generateHeatmap(w, h)
    const heatmapU8 = new Uint8Array(heatmap.buffer)
    const heatmapStr = Array<string>(heatmap.length)
    for (let i = 0; i < heatmapU8.length; i += 4) {
        const r = heatmapU8[i + 0].toString(16).padStart(2, '0')
        const g = heatmapU8[i + 1].toString(16).padStart(2, '0')
        const b = heatmapU8[i + 2].toString(16).padStart(2, '0')
        const a = heatmapU8[i + 3].toString(16).padStart(2, '0')
        heatmapStr[i / 4] = `#${r}${g}${b}${a}`
    }
    return heatmapStr
}

type RenderFunction<TElement, THeatmap> = (
    element: TElement,
) => Promise<(gen: HeatmapFunction<THeatmap>, edge: number, gap: number, fill: boolean) => void>

const renderSvg: RenderFunction<SVGSVGElement, string[]> = async element => {
    const svgNs = 'http://www.w3.org/2000/svg'
    element.childNodes.forEach(child => child.remove())
    const group = element.appendChild(document.createElementNS(svgNs, 'g'))

    return (gen, edge, gap, fill) => {
        const size = { w: element.clientWidth, h: element.clientHeight }
        const fit = { w: size.w / (edge + gap), h: size.h / (edge + gap) }
        const dim = { w: Math.floor(fit.w), h: Math.floor(fit.h) }
        const heatmap = gen(dim.w, dim.h)
        const count = dim.w * dim.h
        for (let i = group.childElementCount; i < count; i++) group.append(document.createElementNS(svgNs, 'rect'))
        for (let i = group.childElementCount; i > count; i--) group.lastChild!.remove()
        group.setAttribute('transform', fill ? `scale(${fit.w / dim.w}, ${fit.h / dim.h})` : '')
        const rects = group.childNodes
        for (let y = 0; y < dim.h; y++)
            for (let x = 0; x < dim.w; x++) {
                const rect = rects[y * dim.w + x] as SVGRectElement
                rect.setAttribute('width', `${edge}`)
                rect.setAttribute('height', `${edge}`)
                rect.setAttribute('x', `${x * (edge + gap)}`)
                rect.setAttribute('y', `${y * (edge + gap)}`)
                rect.setAttribute('fill', heatmap[x + y * dim.w])
            }
    }
}

const renderCanvas: RenderFunction<HTMLCanvasElement, string[]> = async element => {
    const context = element.getContext('2d')!

    return (gen, edge, gap, fill) => {
        const size = { w: element.clientWidth, h: element.clientHeight }
        const fit = { w: size.w / (edge + gap), h: size.h / (edge + gap) }
        const dim = { w: Math.floor(fit.w), h: Math.floor(fit.h) }
        context.resetTransform()
        context.clearRect(0, 0, context.canvas.width, context.canvas.height)
        context.scale(!fill ? 1 : fit.w / dim.w, !fill ? 1 : fit.h / dim.h)
        const heatmap = gen(dim.w, dim.h)
        for (let y = 0; y < dim.h; y++)
            for (let x = 0; x < dim.w; x++) {
                context.fillStyle = heatmap[x + y * dim.w]
                context.fillRect(x * (edge + gap), y * (edge + gap), edge, edge)
            }
    }
}

const renderWebgl: RenderFunction<HTMLCanvasElement, Uint32Array> = async element => {
    const gl = element.getContext('webgl2')!
    const program = gl.createProgram()!
    const sources = [squareVertGlsl, heatwaveFragGlsl]
    const shaders = [gl.createShader(gl.VERTEX_SHADER)!, gl.createShader(gl.FRAGMENT_SHADER)!]
    shaders.forEach((s, i) => (gl.shaderSource(s, sources[i]), gl.compileShader(s), gl.attachShader(program, s)))
    gl.linkProgram(program)
    const attributeVertex = gl.getAttribLocation(program, 'vertex')!
    const uniformColors = gl.getUniformLocation(program, 'colors')!
    const uniformSize = gl.getUniformLocation(program, 'size')!
    const uniformFit = gl.getUniformLocation(program, 'fit')!
    const uniformDim = gl.getUniformLocation(program, 'dim')!
    const uniformEdge = gl.getUniformLocation(program, 'edge')!
    const uniformGap = gl.getUniformLocation(program, 'gap')!
    const uniformFill = gl.getUniformLocation(program, 'fill')!
    const vertexBuffer = gl.createBuffer()!
    let heatmapTexture = gl.createTexture()!

    return (gen, edge, gap, fill) => {
        const size = { w: element.clientWidth, h: element.clientHeight }
        const fit = { w: size.w / (edge + gap), h: size.h / (edge + gap) }
        const dim = { w: Math.floor(fit.w), h: Math.floor(fit.h) }
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(program)
        gl.uniform2f(uniformSize, size.w, size.h)
        gl.uniform2f(uniformFit, fit.w, fit.h)
        gl.uniform2f(uniformDim, dim.w, dim.h)
        gl.uniform1f(uniformEdge, edge)
        gl.uniform1f(uniformGap, gap)
        gl.uniform1f(uniformFill, +fill)
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        gl.vertexAttribPointer(attributeVertex, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(attributeVertex)
        gl.activeTexture(gl.TEXTURE0)
        // gl.deleteTexture(heatmapTexture)
        // heatmapTexture = gl.createTexture()!
        const heatmap = new Uint8Array(gen(dim.w, dim.h).buffer)
        gl.bindTexture(gl.TEXTURE_2D, heatmapTexture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dim.w, dim.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, heatmap)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.uniform1i(uniformColors, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
}

const renderWebgpu: RenderFunction<HTMLCanvasElement, Uint32Array> = async element => {
    const adapter = (await navigator.gpu.requestAdapter())!
    const device = await adapter.requestDevice()
    const context = element.getContext('webgpu')!
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'premultiplied' })
    const module = device.createShaderModule({ code: heatwaveWgsl })
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format: format }] },
        primitive: { topology: 'triangle-list' },
    })
    const layoutBuffer = device.createBuffer({ size: 15 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    const layoutData = new Float32Array(layoutBuffer.size / Float32Array.BYTES_PER_ELEMENT)
    let heatmapBuffer = device.createBuffer({ size: 0, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    let currentDim = { w: 0, h: 0 }

    return (gen, edge, gap, fill) => {
        const size = { w: element.clientWidth, h: element.clientHeight }
        const fit = { w: size.w / (edge + gap), h: size.h / (edge + gap) }
        const dim = { w: Math.floor(fit.w), h: Math.floor(fit.h) }
        layoutData.set([size.w, size.h, fit.w, fit.h, dim.w, dim.h, edge, gap, +fill])
        device.queue.writeBuffer(layoutBuffer, 0, layoutData)
        if (dim.w !== currentDim.w || dim.h !== currentDim.h) {
            currentDim = dim
            heatmapBuffer = device.createBuffer({ size: dim.w * dim.h * 4, usage: heatmapBuffer.usage })
        }
        device.queue.writeBuffer(heatmapBuffer, 0, gen(dim.w, dim.h))
        const view = context.getCurrentTexture().createView()
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{ view, clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store' }],
        }
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: layoutBuffer } },
                { binding: 1, resource: { buffer: heatmapBuffer } },
            ],
        })
        const encoder = device.createCommandEncoder()
        const pass = encoder.beginRenderPass(renderPassDescriptor)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(6)
        pass.end()
        device.queue.submit([encoder.finish()])
    }
}

const [widthControl, heightControl, edgeControl, gapControl, fillControl] = document
    .querySelector('#controls')!
    .querySelectorAll('input')
const [svgToggle, canvasToggle, webgl2Toggle, webgpuToggle] = document
    .querySelector('#toggles')!
    .querySelectorAll('input')
const svgView = document.querySelector('#views')!.querySelector('svg')!
const [canvasView, webgl2View, webgpuView] = document.querySelector('#views')!.querySelectorAll('canvas')
const [svgTime, canvasTime, webgl2Time, webgpuTime] = document.querySelector('#views')!.querySelectorAll('span')

const controls = {
    width: widthControl.valueAsNumber,
    height: heightControl.valueAsNumber,
    edge: edgeControl.valueAsNumber,
    gap: gapControl.valueAsNumber,
    fill: fillControl.checked,
}

const toggles = {
    svg: svgToggle.checked,
    canvas: canvasToggle.checked,
    webgl2: webgl2Toggle.checked,
    webgpu: webgpuToggle.checked,
}

widthControl.addEventListener('input', e => {
    controls.width = (e.currentTarget as HTMLInputElement).valueAsNumber
    svgView.style.width = `${controls.width}px`
    canvasView.width = controls.width
    webgl2View.width = controls.width
    webgpuView.width = controls.width
})
heightControl.addEventListener('input', e => {
    controls.height = (e.currentTarget as HTMLInputElement).valueAsNumber
    svgView.style.height = `${controls.height}px`
    canvasView.height = controls.height
    webgl2View.height = controls.height
    webgpuView.height = controls.height
})

edgeControl.addEventListener('input', e => (controls.edge = (e.currentTarget as HTMLInputElement).valueAsNumber))
gapControl.addEventListener('input', e => (controls.gap = (e.currentTarget as HTMLInputElement).valueAsNumber))
fillControl.addEventListener('input', e => (controls.fill = (e.currentTarget as HTMLInputElement).checked))

svgToggle.addEventListener('input', e => (toggles.svg = (e.currentTarget as HTMLInputElement).checked))
canvasToggle.addEventListener('input', e => (toggles.canvas = (e.currentTarget as HTMLInputElement).checked))
webgl2Toggle.addEventListener('input', e => (toggles.webgl2 = (e.currentTarget as HTMLInputElement).checked))
webgpuToggle.addEventListener('input', e => (toggles.webgpu = (e.currentTarget as HTMLInputElement).checked))

const render = async (
    name: keyof typeof toggles,
    element: any,
    time: HTMLSpanElement,
    render: RenderFunction<any, any>,
    generateHeatmap: HeatmapFunction<any>,
) => {
    const setupStart = performance.now()
    const draw = await render(element)
    const setupEnd = performance.now()
    console.log(`${render.name} setup:`, (setupEnd - setupStart).toFixed(2))

    const genTimes: number[] = []
    const drawTimes: number[] = []

    const gen: typeof generateHeatmap = (...args) => {
        const genStart = performance.now()
        const heatmap = generateHeatmap(...args)
        const genEnd = performance.now()
        genTimes.push(genEnd - genStart)
        return heatmap
    }

    const frame = () => {
        requestAnimationFrame(frame)
        if (!toggles[name]) return
        const drawStart = performance.now()
        draw(gen, controls.edge, controls.gap, controls.fill)
        const drawEnd = performance.now()
        drawTimes.push(drawEnd - drawStart)
    }
    requestAnimationFrame(frame)

    setInterval(() => {
        if (!toggles[name]) return
        const genTime = genTimes.reduce((acc, next) => acc + next, 0) / (genTimes.length || 1)
        const avg = (drawTimes.reduce((acc, next) => acc + next, -genTime) / drawTimes.length).toFixed(2)
        const max = Math.max(...drawTimes).toFixed(2)
        genTimes.length = 0
        drawTimes.length = 0
        time.textContent = JSON.stringify({ avg, max })
    }, 500)
}

render('svg', svgView, svgTime, renderSvg, generateHeatmapStr)
render('canvas', canvasView, canvasTime, renderCanvas, generateHeatmapStr)
render('webgl2', webgl2View, webgl2Time, renderWebgl, generateHeatmap)
render('webgpu', webgpuView, webgpuTime, renderWebgpu, generateHeatmap)
