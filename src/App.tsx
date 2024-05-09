import { createEffect } from 'solid-js'
import classes from './App.module.scss'
import { generateCloud, renderWebgpu } from './simulation/simulation'

export const App = () => {
    let canvas!: HTMLCanvasElement

    // // const optionsStore = createStore(structuredClone(optionsDefaults))

    createEffect(async () => {
        const canvas = document.querySelector('canvas')!
        const draw = await renderWebgpu(canvas, generateCloud(1000))
        const d = () => (requestAnimationFrame(d), draw(), console.log('frame'))
        requestAnimationFrame(d)
    })

    return (
        <article class={classes.app}>
            <canvas ref={canvas} />
        </article>
    )
}

// const Options = (props: { options: ReturnType<typeof createStore<Options>> }) => {
//     const [options, setOptions] = props.options

//     return (
//         <div class={classes.options}>
//             <h2>GPU preferences</h2>
//             <label>
//                 <span>Force fallback adapter:</span>
//                 <input
//                     type='checkbox'
//                     checked={options.forceFallbackAdapter}
//                     onInput={e => setOptions({ forceFallbackAdapter: e.target.checked })}
//                 />
//             </label>
//             <label>
//                 <span>Power preference:</span>
//                 <select
//                     value={options.powerPreference}
//                     onInput={e => setOptions({ powerPreference: e.target.value as any })}
//                 >
//                     <For each={optionsConstraints.powerPreference}>{pp => <option value={pp}>{pp}</option>}</For>
//                 </select>
//             </label>
//             <label>
//                 <span>Workgroup size (x,1,1):</span>
//                 <select value={options.workloadSize} onInput={e => setOptions({ workloadSize: +e.target.value })}>
//                     <For each={optionsConstraints.workloadSize}>{ws => <option value={ws}>{ws}</option>}</For>
//                 </select>
//             </label>
//             <h2>Simulation preferences</h2>
//             <label>
//                 <span>G. constant: {options.gConstant}</span>
//                 <input
//                     type='range'
//                     {...optionsConstraints.gConstant}
//                     value={options.gConstant}
//                     onInput={e => setOptions({ gConstant: +e.target.value })}
//                 />
//             </label>
//             <label>
//                 <span>G. softening: {options.gSoftening}</span>
//                 <input
//                     type='range'
//                     {...optionsConstraints.gSoftening}
//                     value={options.gSoftening}
//                     onInput={e => setOptions({ delta: +e.target.value })}
//                 />
//             </label>
//             <label>
//                 <span>Delta: {options.delta}</span>
//                 <input
//                     type='range'
//                     {...optionsConstraints.delta}
//                     value={options.delta}
//                     onInput={e => setOptions({ delta: +e.target.value })}
//                 />
//             </label>
//             <label>
//                 <span>Number of bodies:</span>
//                 <select value={options.bodies} onInput={e => setOptions({ bodies: +e.target.value })}>
//                     <For each={optionsConstraints.bodies}>{nb => <option value={nb}>{nb}</option>}</For>
//                 </select>
//             </label>
//             <div>
//                 <button onClick={() => setOptions({ reset: !options.reset })}>reset</button>
//                 <button onClick={() => setOptions({ paused: !options.paused })}>
//                     {options.paused ? 'play' : 'pause'}
//                 </button>
//             </div>
//         </div>
//     )
// }
