"""
Phase 15 — stylized player / customer / worker character silhouettes.

Meshes are authored in metres with the same rest extents the presenters already use:
  player body  ≈ 0.6 × 1.6 × 0.6 (centered; rest Y 0.8)
  customer     ≈ 0.55 × 1.5 × 0.55 (centered; rest Y 0.75)
  worker       ≈ 0.55 × 1.55 × 0.55 (centered; rest Y 0.78)
Node scale stays [1,1,1] so Filament/Three locomotion only tweaks T/R.
"""
from __future__ import annotations

from glb_geometry import add_box, mesh_bounds


def _pack(pos, nrm, idx):
    return pos, nrm, idx, mesh_bounds(pos)


def player_body_module():
    """Player: torso, head, legs, arms — centered on origin."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.10, 0.0), (0.42, 0.70, 0.28))  # torso
    add_box(pos, nrm, idx, (0.0, 0.58, 0.0), (0.28, 0.28, 0.28))  # head
    add_box(pos, nrm, idx, (-0.18, -0.45, 0.0), (0.14, 0.55, 0.14))  # L leg
    add_box(pos, nrm, idx, (0.18, -0.45, 0.0), (0.14, 0.55, 0.14))  # R leg
    add_box(pos, nrm, idx, (-0.32, 0.15, 0.0), (0.12, 0.45, 0.12))  # L arm
    add_box(pos, nrm, idx, (0.32, 0.15, 0.0), (0.12, 0.45, 0.12))  # R arm
    add_box(pos, nrm, idx, (0.0, -0.05, -0.18), (0.36, 0.35, 0.10))  # apron/pack
    return _pack(pos, nrm, idx)


def player_rod_module():
    """Fishing rod — thin stick; presenters tip it during cast."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.04, 1.10, 0.04))
    add_box(pos, nrm, idx, (0.0, 1.12, 0.0), (0.06, 0.06, 0.06))  # tip
    add_box(pos, nrm, idx, (0.0, 0.05, 0.0), (0.08, 0.12, 0.08))  # grip
    return _pack(pos, nrm, idx)


def customer_body_module(variant: int = 0):
    """Customer silhouette variants (shopper / tourist / critic)."""
    pos, nrm, idx = [], [], []
    torso_w = 0.40 + (variant % 3) * 0.04
    add_box(pos, nrm, idx, (0.0, 0.08, 0.0), (torso_w, 0.65, 0.26))
    add_box(pos, nrm, idx, (0.0, 0.52, 0.0), (0.26, 0.26, 0.26))
    add_box(pos, nrm, idx, (-0.14, -0.42, 0.0), (0.12, 0.50, 0.12))
    add_box(pos, nrm, idx, (0.14, -0.42, 0.0), (0.12, 0.50, 0.12))
    add_box(pos, nrm, idx, (-0.28, 0.12, 0.0), (0.10, 0.40, 0.10))
    add_box(pos, nrm, idx, (0.28, 0.12, 0.0), (0.10, 0.40, 0.10))
    if variant % 3 == 1:  # tourist bag
        add_box(pos, nrm, idx, (0.22, -0.05, 0.05), (0.16, 0.22, 0.12))
    if variant % 3 == 2:  # critic hat
        add_box(pos, nrm, idx, (0.0, 0.70, 0.0), (0.32, 0.08, 0.32))
        add_box(pos, nrm, idx, (0.0, 0.78, 0.0), (0.18, 0.10, 0.18))
    return _pack(pos, nrm, idx)


def worker_body_module(kind: str = "generic"):
    """Worker silhouette by role family."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.10, 0.0), (0.40, 0.68, 0.26))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.26, 0.26, 0.26))
    add_box(pos, nrm, idx, (-0.15, -0.44, 0.0), (0.12, 0.52, 0.12))
    add_box(pos, nrm, idx, (0.15, -0.44, 0.0), (0.12, 0.52, 0.12))
    add_box(pos, nrm, idx, (-0.30, 0.12, 0.0), (0.10, 0.42, 0.10))
    add_box(pos, nrm, idx, (0.30, 0.12, 0.0), (0.10, 0.42, 0.10))
    if kind == "fisher":
        add_box(pos, nrm, idx, (0.34, 0.35, 0.05), (0.05, 0.70, 0.05))  # rod
    elif kind == "porter":
        add_box(pos, nrm, idx, (0.0, 0.05, -0.22), (0.45, 0.35, 0.16))  # crate
    elif kind == "operator":
        add_box(pos, nrm, idx, (0.0, 0.05, 0.18), (0.42, 0.35, 0.08))  # apron
    else:
        add_box(pos, nrm, idx, (0.0, 0.20, 0.16), (0.36, 0.20, 0.08))  # vest
    return _pack(pos, nrm, idx)


CHARACTER_COLORS = {
    "player": "#153449",
    "player_rod": "#6B4A2E",
    "customer_0": "#B3412E",
    "customer_1": "#C45C26",
    "customer_2": "#7A4E8A",
    "worker_fisher": "#2F6B6E",
    "worker_porter": "#6B5A3E",
    "worker_operator": "#4A6B8A",
    "worker_generic": "#3E5A4A",
}

CHARACTER_BUILDERS = {
    "player": player_body_module,
    "player_rod": player_rod_module,
    "customer_0": lambda: customer_body_module(0),
    "customer_1": lambda: customer_body_module(1),
    "customer_2": lambda: customer_body_module(2),
    "worker_fisher": lambda: worker_body_module("fisher"),
    "worker_porter": lambda: worker_body_module("porter"),
    "worker_operator": lambda: worker_body_module("operator"),
    "worker_generic": lambda: worker_body_module("generic"),
}
