struct HeatmapLayout {
    size: vec2f,
    fit: vec2f,
    dim: vec2f,
    edge: f32,
    gap: f32,
    fill: f32,
};

@group(0) @binding(0) var<uniform> heatmapLayout: HeatmapLayout;
@group(0) @binding(1) var<storage, read> heatmapColors: array<u32>;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    var square = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, 1.0),
    );
    return vec4f(square[i], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
    var coord = position.xy;
    if (bool(heatmapLayout.fill)) { coord = coord * (heatmapLayout.dim / heatmapLayout.fit); }
    var dimCoord = floor(coord.xy / (heatmapLayout.edge + heatmapLayout.gap));
    var cellCoord = coord.xy % (heatmapLayout.edge + heatmapLayout.gap);
    var inGrid = f32(cellCoord.x <= heatmapLayout.edge && cellCoord.y <= heatmapLayout.edge && dimCoord.x < heatmapLayout.dim.x && dimCoord.y < heatmapLayout.dim.y);
    var colorU = heatmapColors[u32(dimCoord.x + dimCoord.y * heatmapLayout.dim.x)];
    var color = vec4f((vec4u(colorU) >> vec4u(0, 8, 16, 24)) & vec4u(255)) / 255;
    return vec4f(color.rgb, color.a * inGrid);
}
