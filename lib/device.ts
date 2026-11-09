/** GPU / device heuristics, same lists and rules as the original. */
const LOW = [/mali-g(31|51|52|57|68)\b/, /mali-g7[126]\b/, /mali-t/, /mali-4/, /powervr/, /adreno.*\b([2-5]\d\d|6[0-3]\d)\b/, /swiftshader|llvmpipe|software/, /intel.*hd graphics [2-5]\d\d\b/];
const HIGH_MOBILE = [/adreno.*\b(7[3-9]\d|8\d\d)\b/, /immortalis/, /mali-g(715|720|925)\b/, /xclipse/];

function renderer() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

/** Direct3D (ANGLE on Windows) compiles shaders slowly: show the "preparing" screen before the intro. */
export function prepareFirst() {
  const q = new URLSearchParams(location.search).get("prepare");
  if (q === "1" || q === "0") return q === "1";
  return /direct3d/i.test(renderer());
}

/** Lambert instead of standard shading (?simple=1, or where shaders are expensive). */
export function simpleShading() {
  const q = new URLSearchParams(location.search).get("simple");
  if (q === "1" || q === "0") return q === "1";
  return prepareFirst();
}

export function startingQuality(): "low" | "medium" | "high" {
  const r = renderer().toLowerCase();
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = matchMedia("(pointer: coarse)").matches;
  if (mem <= 3 || navigator.hardwareConcurrency <= 4 || LOW.some((x) => x.test(r))) return "low";
  if (coarse) return HIGH_MOBILE.some((x) => x.test(r)) ? "high" : "medium";
  return "high";
}
