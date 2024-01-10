/**
 * Star properties.
 *
 * - `mass`: Star mass in solar units.
 * - `radius`: Star radius in solar units.
 * - `temperature`: Star temperature in Kelvin.
 * - `wavelength`: Peak wavelength in nanometters.
 * - `color`: Star aparent color.
 */
struct Star {
    mass: f32,
    radius: f32,
    temperature: f32,
    wavelength: f32,
    color: vec4f,
}

/**
 * Star temperature to color table. Range from 0K to 20000K, skips of 1000K.
 */
const star_colors = array(
    vec4f(0.000, 0.000, 0.000, 1.0),
    vec4f(1.000, 0.040, 0.000, 1.0),
    vec4f(1.000, 0.248, 0.006, 1.0),
    vec4f(1.000, 0.458, 0.148, 1.0),
    vec4f(1.000, 0.635, 0.368, 1.0),
    vec4f(1.000, 0.779, 0.618, 1.0),
    vec4f(1.000, 0.895, 0.866, 1.0),
    vec4f(0.910, 0.900, 1.000, 1.0),
    vec4f(0.764, 0.813, 1.000, 1.0),
    vec4f(0.669, 0.754, 1.000, 1.0),
    vec4f(0.603, 0.710, 1.000, 1.0),
    vec4f(0.555, 0.677, 1.000, 1.0),
    vec4f(0.518, 0.651, 1.000, 1.0),
    vec4f(0.490, 0.631, 1.000, 1.0),
    vec4f(0.467, 0.614, 1.000, 1.0),
    vec4f(0.449, 0.600, 1.000, 1.0),
    vec4f(0.434, 0.589, 1.000, 1.0),
    vec4f(0.421, 0.579, 1.000, 1.0),
    vec4f(0.410, 0.570, 1.000, 1.0),
    vec4f(0.400, 0.563, 1.000, 1.0),
    vec4f(0.392, 0.556, 1.000, 1.0),
);

/**
 * Calculate star properties based on its `mass` in solar masses and return ths star properties.
 */
fn get_star(mass: f32) -> Star {
    let radius = pow(mass, 0.8);
    let temperature = 5740.0 * pow(mass, 0.54);
    let wavelength = 2897772 / temperature;
    let ci = temperature / 1000;
    let cj = ci - floor(ci);
    let c0 = star_colors[i32(max(floor(ci), 0.0))];
    let c1 = star_colors[i32(min(ceil(ci), 20.0))];
    let color = c0 * (1.0 - cj) + c1 * cj;
    return Star(mass, radius, temperature, wavelength, color);
}

struct VertFrag {
    @builtin(position) position: vec4f,
    @location(0) coord: vec4f,
    @location(1) color: vec4f,
    @location(2) radius: f32,
}

const square = array(
    vec4f(-1.0, -1.0, 0.0, 0.0),
    vec4f( 1.0, -1.0, 0.0, 0.0),
    vec4f(-1.0,  1.0, 0.0, 0.0),
    vec4f(-1.0,  1.0, 0.0, 0.0),
    vec4f( 1.0, -1.0, 0.0, 0.0),
    vec4f( 1.0,  1.0, 0.0, 0.0),
);

@vertex
fn vs(@builtin(instance_index) ii: u32, @builtin(vertex_index) vi: u32, @location(0) position: vec4f) -> VertFrag {
    let mass = position.w;
    let star = get_star(mass);
    var vf: VertFrag;
    vf.radius = max(log(star.radius), 1) * 0.02;
    vf.coord = square[vi] * vf.radius;
    vf.position = vec4f((position + vf.coord).xyz, 1.0);
    vf.color = star.color;
    return vf;
}

@fragment
fn fs(vf: VertFrag) -> @location(0) vec4f {
    let distance = length(vf.coord);
    if length(vf.coord) >= vf.radius { discard; }
    let luminance = cos((distance / vf.radius) * radians(90.0));
    let c0 = vf.color;
    let c1 = vec4f(1.0);
    let c = c0 * (1.0 - luminance) + c1 * luminance;
    return c;
}
