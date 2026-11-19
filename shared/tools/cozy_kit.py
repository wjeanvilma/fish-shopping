"""
Cozy art kit (art pass 5): rounded low-poly primitives with baked vertex colours.

Everything here is presentation-only. Meshes carry POSITION, NORMAL and COLOR_0
(linear RGB) so one primitive can hold many colours; the harbor material is white
and both renderers (Three.js, Filament gltfio) multiply COLOR_0 by baseColorFactor.

Conventions: metres, y up, +z forward. Colours are sRGB hex strings.
Deterministic: all "random" variation comes from a seeded hash, so regenerated
GLBs are byte-identical for the same content pack.
"""
from __future__ import annotations

import math
import struct


# --------------------------------------------------------------------------- colour

def srgb_hex_to_linear(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")

    def ch(v: int) -> float:
        c = v / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return (ch(int(h[0:2], 16)), ch(int(h[2:4], 16)), ch(int(h[4:6], 16)))


def shade(hex_color: str, factor: float) -> str:
    """Multiply an sRGB hex colour (factor < 1 darkens, > 1 lightens toward white)."""
    h = hex_color.lstrip("#")
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    if factor <= 1:
        rgb = [round(c * factor) for c in rgb]
    else:
        t = min(1.0, factor - 1.0)
        rgb = [round(c + (255 - c) * t) for c in rgb]
    return "#" + "".join(f"{max(0, min(255, c)):02x}" for c in rgb)


def mix(a: str, b: str, t: float) -> str:
    ha, hb = a.lstrip("#"), b.lstrip("#")
    ca = [int(ha[i:i + 2], 16) for i in (0, 2, 4)]
    cb = [int(hb[i:i + 2], 16) for i in (0, 2, 4)]
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(ca, cb))


def hash01(*vals: float) -> float:
    """Deterministic pseudo-random in [0, 1) from coordinates (stable across runs)."""
    x = 0
    for v in vals:
        x = (x * 1_000_003 + int(round(v * 1000)) * 2_654_435_761) & 0xFFFFFFFF
    x ^= x >> 13
    x = (x * 0x5BD1E995) & 0xFFFFFFFF
    x ^= x >> 15
    return (x & 0xFFFFFF) / float(0x1000000)


class Rng:
    """Tiny deterministic LCG for prop scattering."""

    def __init__(self, seed: int):
        self.s = seed & 0xFFFFFFFF or 1

    def next(self) -> float:
        self.s = (1664525 * self.s + 1013904223) & 0xFFFFFFFF
        return self.s / 4294967296.0

    def range(self, a: float, b: float) -> float:
        return a + (b - a) * self.next()

    def pick(self, items):
        return items[int(self.next() * len(items)) % len(items)]


# --------------------------------------------------------------------------- mesh

class Mesh:
    """Indexed triangle mesh with per-vertex colour."""

    def __init__(self):
        self.pos: list[tuple[float, float, float]] = []
        self.nrm: list[tuple[float, float, float]] = []
        self.col: list[tuple[float, float, float]] = []
        self.idx: list[int] = []

    # ---- low level
    def _v(self, p, n, rgb) -> int:
        self.pos.append((round(p[0], 4), round(p[1], 4), round(p[2], 4)))
        ln = (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) ** 0.5 or 1.0
        self.nrm.append((round(n[0] / ln, 4), round(n[1] / ln, 4), round(n[2] / ln, 4)))
        self.col.append(tuple(round(c, 4) for c in rgb))
        return len(self.pos) - 1

    def _tint(self, color: str, p, jitter: float, ao_floor: float | None):
        r, g, b = srgb_hex_to_linear(color)
        f = 1.0
        if jitter:
            f *= 1.0 + (hash01(p[0], p[1], p[2]) - 0.5) * 2 * jitter
        if ao_floor is not None:
            # Gentle ambient occlusion: darker toward the ground (y=0), full at y>=0.6 m.
            f *= ao_floor + (1.0 - ao_floor) * max(0.0, min(1.0, p[1] / 0.6))
        return (min(1.0, r * f), min(1.0, g * f), min(1.0, b * f))

    def quad(self, a, b, c, d, n, color, jitter=0.0, ao=None, alphas=None):
        """Flat quad a-b-c-d (counter-clockwise seen from the normal side). `alphas` = per-corner 0..1."""
        i = []
        for k, p in enumerate((a, b, c, d)):
            rgb = self._tint(color, p, jitter, ao)
            if alphas is not None:
                rgb = (rgb[0], rgb[1], rgb[2], alphas[k])
            i.append(self._v(p, n, rgb))
        self.idx += [i[0], i[1], i[2], i[0], i[2], i[3]]

    def append(self, other: "Mesh", offset=(0.0, 0.0, 0.0)) -> None:
        base = len(self.pos)
        ox, oy, oz = offset
        self.pos += [(round(x + ox, 4), round(y + oy, 4), round(z + oz, 4)) for x, y, z in other.pos]
        self.nrm += other.nrm
        self.col += other.col
        self.idx += [base + i for i in other.idx]

    # ---- primitives
    def box(self, center, size, color, jitter=0.03, ao=0.82, top=None):
        """Axis-aligned flat-shaded box. `top` optionally colours the +y face."""
        cx, cy, cz = center
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        x0, x1, y0, y1, z0, z1 = cx - hx, cx + hx, cy - hy, cy + hy, cz - hz, cz + hz
        c_top = top or color
        self.quad((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (0, 1, 0), c_top, jitter, ao)
        self.quad((x0, y0, z1), (x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (0, -1, 0), shade(color, 0.7), jitter, ao)
        self.quad((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1), (1, 0, 0), color, jitter, ao)
        self.quad((x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (x0, y0, z0), (-1, 0, 0), color, jitter, ao)
        self.quad((x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (x0, y0, z1), (0, 0, 1), color, jitter, ao)
        self.quad((x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (0, 0, -1), color, jitter, ao)

    def rbox(self, center, size, radius, color, seg=2, jitter=0.03, ao=0.82, top=None):
        """Rounded box with smooth normals (cube-sphere construction). `top` tints up-facing verts."""
        cx, cy, cz = center
        h = (size[0] / 2, size[1] / 2, size[2] / 2)
        r = max(0.001, min(radius, *h))
        inner = (h[0] - r, h[1] - r, h[2] - r)
        n = max(1, seg * 2 + 1)  # grid resolution per face edge (seg=0: soft-shaded box, 24 verts)
        faces = [
            ((1, 0, 0), (0, 1, 0), (0, 0, 1)), ((-1, 0, 0), (0, 1, 0), (0, 0, -1)),
            ((0, 1, 0), (0, 0, 1), (1, 0, 0)), ((0, -1, 0), (0, 0, -1), (1, 0, 0)),
            ((0, 0, 1), (0, 1, 0), (-1, 0, 0)), ((0, 0, -1), (0, 1, 0), (1, 0, 0)),
        ]
        for nf, u, v in faces:
            grid = []
            for j in range(n + 1):
                row = []
                for i in range(n + 1):
                    s = -1 + 2 * i / n
                    t = -1 + 2 * j / n
                    # Concentrate samples near the edges so the flat middle stays flat.
                    s = math.copysign(abs(s) ** 0.5, s) if seg > 1 else s
                    t = math.copysign(abs(t) ** 0.5, t) if seg > 1 else t
                    p = [nf[k] * h[k] + u[k] * h[k] * s + v[k] * h[k] * t for k in range(3)]
                    q = [max(-inner[k], min(inner[k], p[k])) for k in range(3)]
                    d = [p[k] - q[k] for k in range(3)]
                    ln = math.sqrt(sum(c * c for c in d)) or 1.0
                    nn = [c / ln for c in d]
                    world = (cx + q[0] + nn[0] * r, cy + q[1] + nn[1] * r, cz + q[2] + nn[2] * r)
                    color_here = top if (top and nn[1] > 0.55) else color
                    row.append(self._v(world, nn, self._tint(color_here, world, jitter, ao)))
                grid.append(row)
            for j in range(n):
                for i in range(n):
                    a, b, c, d = grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]
                    self.idx += [a, b, c, a, c, d]

    def cylinder(self, base, radius, height, color, seg=10, caps=True, jitter=0.02, ao=0.82,
                 top_color=None, radius_top=None, axis="y"):
        """Smooth-sided cylinder (or cone/frustum via radius_top) standing on `base`."""
        rt = radius if radius_top is None else radius_top
        bx, by, bz = base

        def place(px, py, pz):
            if axis == "y":
                return (bx + px, by + py, bz + pz)
            if axis == "x":
                return (bx + py, by + px, bz + pz)
            return (bx + px, by + pz, bz + py)  # z axis

        def nplace(nx, ny, nz):
            if axis == "y":
                return (nx, ny, nz)
            if axis == "x":
                return (ny, nx, nz)
            return (nx, nz, ny)

        slope = (radius - rt) / max(height, 1e-6)
        ring0, ring1 = [], []
        for k in range(seg + 1):
            a = 2 * math.pi * k / seg
            ca, sa = math.cos(a), math.sin(a)
            ln = math.sqrt(1 + slope * slope)
            nrm = nplace(ca / ln, slope / ln, sa / ln)
            p0 = place(ca * radius, 0, sa * radius)
            p1 = place(ca * rt, height, sa * rt)
            ring0.append(self._v(p0, nrm, self._tint(color, p0, jitter, ao)))
            ring1.append(self._v(p1, nrm, self._tint(color, p1, jitter, ao)))
        for k in range(seg):
            self.idx += [ring0[k], ring1[k + 1], ring1[k], ring0[k], ring0[k + 1], ring1[k + 1]]
        if caps:
            for y, rr, up, cc in ((height, rt, 1, top_color or color), (0.0, radius, -1, shade(color, 0.75))):
                if rr <= 0.0005:
                    continue
                cn = nplace(0, up, 0)
                center = self._v(place(0, y, 0), cn, self._tint(cc, place(0, y, 0), jitter, ao))
                ring = []
                for k in range(seg):
                    a = 2 * math.pi * k / seg
                    p = place(math.cos(a) * rr, y, math.sin(a) * rr)
                    ring.append(self._v(p, cn, self._tint(cc, p, jitter, ao)))
                for k in range(seg):
                    a, b = ring[k], ring[(k + 1) % seg]
                    self.idx += [center, b, a] if up > 0 else [center, a, b]

    def sphere(self, center, radius, color, seg=8, rings=6, squash=(1.0, 1.0, 1.0), jitter=0.02, ao=None):
        """Low-poly UV sphere / ellipsoid (smooth normals)."""
        cx, cy, cz = center
        sx, sy, sz = squash
        grid = []
        for j in range(rings + 1):
            phi = math.pi * j / rings
            row = []
            for i in range(seg + 1):
                th = 2 * math.pi * i / seg
                nx, ny, nz = math.sin(phi) * math.cos(th), math.cos(phi), math.sin(phi) * math.sin(th)
                p = (cx + nx * radius * sx, cy + ny * radius * sy, cz + nz * radius * sz)
                ln = math.sqrt((nx / sx) ** 2 + (ny / sy) ** 2 + (nz / sz) ** 2) or 1
                row.append(self._v(p, (nx / sx / ln, ny / sy / ln, nz / sz / ln), self._tint(color, p, jitter, ao)))
            grid.append(row)
        for j in range(rings):
            for i in range(seg):
                a, b, c, d = grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]
                self.idx += [a, c, b, a, d, c]

    def bounds(self):
        xs = [p[0] for p in self.pos] or [0]
        ys = [p[1] for p in self.pos] or [0]
        zs = [p[2] for p in self.pos] or [0]
        return [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]

    def vertex_count(self) -> int:
        return len(self.pos)


# --------------------------------------------------------------------------- packing

def pack_parts(parts: list[Mesh | tuple]) -> tuple[bytes, list[dict], list[dict], list[dict]]:
    """
    Pack meshes into one BIN chunk. Accepts cozy `Mesh` objects (with COLOR_0) or legacy
    (pos, nrm, idx, bounds) tuples. Returns (blob, bufferViews, accessors, attrs) where
    attrs[i] = {"POSITION": a, "NORMAL": b, ["COLOR_0": c], "indices": d} for part i.
    """
    blob = bytearray()
    views: list[dict] = []
    accessors: list[dict] = []
    attrs: list[dict] = []

    def add(chunk: bytes, target: int, count: int, typ: str, comp: int, extra: dict) -> int:
        nonlocal blob
        while len(blob) % 4:
            blob += b"\0"
        views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(chunk), "target": target})
        acc = {"bufferView": len(views) - 1, "componentType": comp, "count": count, "type": typ}
        acc.update(extra)
        accessors.append(acc)
        blob += chunk
        return len(accessors) - 1

    for part in parts:
        if isinstance(part, Mesh):
            pos, nrm, col, idx = part.pos, part.nrm, part.col, part.idx
            lo, hi = part.bounds()
        else:
            pos, nrm, idx, (lo, hi) = part
            col = None
        if len(pos) > 65535:
            raise ValueError(f"mesh has {len(pos)} vertices (uint16 index limit)")
        a = {
            "POSITION": add(b"".join(struct.pack("<3f", *p) for p in pos), 34962, len(pos), "VEC3", 5126,
                            {"min": [round(v, 5) for v in lo], "max": [round(v, 5) for v in hi]}),
            "NORMAL": add(b"".join(struct.pack("<3f", *n) for n in nrm), 34962, len(nrm), "VEC3", 5126, {}),
        }
        if col is not None:
            # Normalized unsigned-byte RGBA: 4 bytes/vertex instead of 12 (valid glTF COLOR_0).
            def q(v: float) -> int:
                return max(0, min(255, round(v * 255)))
            packed = b"".join(struct.pack("<4B", q(c[0]), q(c[1]), q(c[2]), q(c[3]) if len(c) > 3 else 255) for c in col)
            a["COLOR_0"] = add(packed, 34962, len(col), "VEC4", 5121, {"normalized": True})
        a["indices"] = add(b"".join(struct.pack("<H", i) for i in idx), 34963, len(idx), "SCALAR", 5123, {})
        attrs.append(a)
    while len(blob) % 4:
        blob += b"\0"
    return bytes(blob), views, accessors, attrs
