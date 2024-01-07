@group(0) @binding(0) var<storage, read> positionOut: array<vec4f>;
@group(0) @binding(1) var<storage, read> positionIn: array<vec4f>;
@group(0) @binding(2) var<storage, read> ve locity: array<vec4f>;

struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) @interpolate(flat) color : vec4f,
}

const square = array(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0),
);

@vertex
fn vs(@builtin(instance_index) ii: u32, @builtin(vertex_index) vi: u32, @location(0) position: vec4f) -> VertexOut {
    var radius = 0.01;
    var out: VertexOut;
    var x = positionOut[0];
    var y = positionIn[0];
    var z = velocity[0];
    out.position = vec4f(position.xy + square[vi] * radius, position.zw);
    out.color = position;
    return out;
}

// @builtin(position) position : vec4<f32>,
//   @location(0) positionInQuad : vec2<f32>,
//   @location(1) @interpolate(flat) color : vec3<f32>,

@fragment
fn fs(
  @builtin(position) position : vec4<f32>,
  @location(0) @interpolate(flat) color : vec4<f32>,
  ) -> @location(0) vec4<f32> {
    return vec4f(0.0, 1.0,0.0,1.0);
  }
