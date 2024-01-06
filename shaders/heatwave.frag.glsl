precision lowp float;

uniform vec2 size;
uniform vec2 fit;
uniform vec2 dim;
uniform float edge;
uniform float gap;
uniform float fill;
uniform sampler2D colors;

void main() {
    vec2 fragCoord = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
    if (bool(fill)) fragCoord  = fragCoord * (dim / fit);
    vec2 dimCoord = floor(fragCoord.xy / (edge + gap));
    vec2 cellCoord = mod(fragCoord.xy, edge + gap);
    float inGrid = float(cellCoord.x <= edge && cellCoord.y <= edge && dimCoord.x < dim.x && dimCoord.y < dim.y);
    vec4 textel = texture2D(colors, dimCoord / dim.xy);
    gl_FragColor = vec4(textel.xyz, textel.w * inGrid);
}
