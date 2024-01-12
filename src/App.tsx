import { For } from 'solid-js'
import { createStore } from 'solid-js/store'
import classes from './App.module.scss'

type Options = {
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

const optionsConstraints = Object.freeze({
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

const optionsDefaults: Options = Object.freeze({
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

export const App = () => {
    const optionsStore = createStore(structuredClone(optionsDefaults))

    return (
        <article class={classes.app}>
            <Options options={optionsStore} />
            <div />
            <canvas />
        </article>
    )
}

const Options = (props: { options: ReturnType<typeof createStore<Options>> }) => {
    const [options, setOptions] = props.options

    return (
        <div class={classes.options}>
            <h2>GPU preferences</h2>
            <label>
                <span>Force fallback adapter:</span>
                <input
                    type='checkbox'
                    checked={options.forceFallbackAdapter}
                    onInput={e => setOptions({ forceFallbackAdapter: e.target.checked })}
                />
            </label>
            <label>
                <span>Power preference:</span>
                <select
                    value={options.powerPreference}
                    onInput={e => setOptions({ powerPreference: e.target.value as any })}
                >
                    <For each={optionsConstraints.powerPreference}>{pp => <option value={pp}>{pp}</option>}</For>
                </select>
            </label>
            <label>
                <span>Workgroup size (x,1,1):</span>
                <select value={options.workloadSize} onInput={e => setOptions({ workloadSize: +e.target.value })}>
                    <For each={optionsConstraints.workloadSize}>{ws => <option value={ws}>{ws}</option>}</For>
                </select>
            </label>
            <h2>Simulation preferences</h2>
            <label>
                <span>G. constant: {options.gConstant}</span>
                <input
                    type='range'
                    {...optionsConstraints.gConstant}
                    value={options.gConstant}
                    onInput={e => setOptions({ gConstant: +e.target.value })}
                />
            </label>
            <label>
                <span>G. softening: {options.gSoftening}</span>
                <input
                    type='range'
                    {...optionsConstraints.gSoftening}
                    value={options.gSoftening}
                    onInput={e => setOptions({ delta: +e.target.value })}
                />
            </label>
            <label>
                <span>Delta: {options.delta}</span>
                <input
                    type='range'
                    {...optionsConstraints.delta}
                    value={options.delta}
                    onInput={e => setOptions({ delta: +e.target.value })}
                />
            </label>
            <label>
                <span>Number of bodies:</span>
                <select value={options.bodies} onInput={e => setOptions({ bodies: +e.target.value })}>
                    <For each={optionsConstraints.bodies}>{nb => <option value={nb}>{nb}</option>}</For>
                </select>
            </label>
            <div>
                <button onClick={() => setOptions({ reset: !options.reset })}>reset</button>
                <button onClick={() => setOptions({ paused: !options.paused })}>
                    {options.paused ? 'play' : 'pause'}
                </button>
            </div>
        </div>
    )
}
