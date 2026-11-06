import { useRef, useState } from "react";

/**
 * Virtual joystick for touch browsers (same rules as the Android Joystick).
 * Reports screen-space x right / y down in -1..1, and (0, 0) on release.
 */
export function Joystick({ onMove, className }: { onMove: (x: number, y: number) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const radius = r.width / 2;
    let x = clientX - (r.left + radius);
    let y = clientY - (r.top + radius);
    const len = Math.hypot(x, y);
    if (len > radius) { x *= radius / len; y *= radius / len; }
    setKnob({ x, y });
    onMove(x / radius, y / radius);
  };
  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={ref}
      className={`stick ${className ?? ""}`}
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (pointer.current === e.pointerId) update(e.clientX, e.clientY); }}
      onPointerUp={(e) => { if (pointer.current === e.pointerId) release(); }}
      onPointerCancel={(e) => { if (pointer.current === e.pointerId) release(); }}
    >
      <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
