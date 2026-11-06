import { useRef, useState, type CSSProperties } from "react";
import { JOYSTICK_BASE_DIAMETER, type JoystickScale, type JoystickSide } from "../game/settingsStore";

/**
 * Floating virtual joystick for touch browsers (same rules as the Android Joystick).
 * The pad fills its container; on press the stick relocates under the finger and reports
 * screen-space x right / y down in -1..1, then (0, 0) on release.
 */
export function Joystick({
  onMove,
  side = "left",
  scale = 1,
  className,
}: {
  onMove: (x: number, y: number) => void;
  side?: JoystickSide;
  scale?: JoystickScale;
  className?: string;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const diameter = JOYSTICK_BASE_DIAMETER * scale;
  const radius = diameter / 2;

  const update = (clientX: number, clientY: number) => {
    const o = origin.current;
    if (!o) return;
    let x = clientX - o.x;
    let y = clientY - o.y;
    const len = Math.hypot(x, y);
    if (len > radius) { x *= radius / len; y *= radius / len; }
    setKnob({ x, y });
    onMove(x / radius, y / radius);
  };
  const release = () => {
    pointer.current = null;
    origin.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const stickStyle: CSSProperties = base
    ? {
        width: diameter,
        height: diameter,
        left: base.x - radius,
        top: base.y - radius,
        transform: "none",
      }
    : {
        width: diameter,
        height: diameter,
        left: side === "left" ? "50%" : "50%",
        bottom: 0,
        top: "auto",
        transform: "translateX(-50%)",
      };

  return (
    <div
      ref={padRef}
      className={`joystick-pad joystick-${side} ${className ?? ""}`}
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(e) => {
        const pad = padRef.current;
        if (!pad) return;
        const r = pad.getBoundingClientRect();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const ox = e.clientX - r.left;
        const oy = e.clientY - r.top;
        origin.current = { x: e.clientX, y: e.clientY };
        setBase({ x: ox, y: oy });
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (pointer.current === e.pointerId) update(e.clientX, e.clientY); }}
      onPointerUp={(e) => { if (pointer.current === e.pointerId) release(); }}
      onPointerCancel={(e) => { if (pointer.current === e.pointerId) release(); }}
    >
      <div className="stick" style={stickStyle}>
        <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
    </div>
  );
}
