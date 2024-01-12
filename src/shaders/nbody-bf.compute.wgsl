@group(0) @binding(0) var<storage, read_write> positionsIn: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> positionsOut: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> velocities: array<vec4f>;

const kDelta = 0.00025;
const kSoftening = 0.2;
 
@compute @workgroup_size(1) fn cs(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  let position = positionsIn[idx];
  var force = vec4f(0.0);
  for (var i = 0; i < 1000; i++) {
      force += computeForce(position, positionsIn[i]);
  }

  // Update velocity.
  var velocity = velocities[idx];
  velocity = velocity + force * kDelta;
  velocities[idx] = velocity;

  // Update position.
  positionsOut[idx] = position + velocity * kDelta;
}

fn computeForce(ipos : vec4<f32>,
                jpos : vec4<f32>,
                ) -> vec4<f32> {
  let d = vec4((jpos - ipos).xyz, 0);
  let distSq = d.x*d.x + d.y*d.y + d.z*d.z + kSoftening*kSoftening;
  let dist   = inverseSqrt(distSq);
  let coeff  = jpos.w * (dist*dist*dist);
  return coeff * d;
}
