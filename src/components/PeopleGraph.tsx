import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { motion, AnimatePresence } from "framer-motion";
import type { Employee } from "@/lib/supabase";

type Node = SimulationNodeDatum & {
  id: string;
  emp: Employee;
};
type Link = SimulationLinkDatum<Node>;

interface Props {
  employees: Employee[];
  onSelect: (e: Employee) => void;
}

export function PeopleGraph({ employees, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const simRef = useRef<ReturnType<typeof forceSimulation<Node>> | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const panning = useRef<{ x: number; y: number } | null>(null);

  // Build graph data
  const { nodes, links } = useMemo(() => {
    const nodes: Node[] = employees.map((e) => ({ id: e.id, emp: e }));
    const links: Link[] = employees
      .filter((e) => e.parent_id)
      .map((e) => ({ source: e.parent_id!, target: e.id }));
    return { nodes, links };
  }, [employees]);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const node = containerRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Simulation
  useEffect(() => {
    if (!nodes.length) return;
    const sim = forceSimulation<Node>(nodes)
      .force(
        "link",
        forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(140)
          .strength(0.6),
      )
      .force("charge", forceManyBody().strength(-420))
      .force("center", forceCenter(size.w / 2, size.h / 2))
      .force("collide", forceCollide().radius(48))
      .alpha(1)
      .alphaDecay(0.02)
      .on("tick", () => setTick((t) => t + 1));
    simRef.current = sim;
    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, size.w, size.h]);

  // Drag handlers
  function onPointerDownNode(e: React.PointerEvent, n: Node) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = screenToWorld(e.clientX, e.clientY);
    dragOffset.current = { x: (n.x ?? 0) - pt.x, y: (n.y ?? 0) - pt.y };
    setDrag(n.id);
    n.fx = n.x;
    n.fy = n.y;
    simRef.current?.alphaTarget(0.3).restart();
  }
  function onPointerMoveNode(e: React.PointerEvent, n: Node) {
    if (drag !== n.id) return;
    const pt = screenToWorld(e.clientX, e.clientY);
    n.fx = pt.x + dragOffset.current.x;
    n.fy = pt.y + dragOffset.current.y;
  }
  function onPointerUpNode(_e: React.PointerEvent, n: Node) {
    if (drag !== n.id) return;
    setDrag(null);
    n.fx = null;
    n.fy = null;
    simRef.current?.alphaTarget(0);
  }

  function screenToWorld(cx: number, cy: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (cx - rect.left - transform.x) / transform.k,
      y: (cy - rect.top - transform.y) / transform.k,
    };
  }

  // Pan
  function onBgPointerDown(e: React.PointerEvent) {
    panning.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }
  function onBgPointerMove(e: React.PointerEvent) {
    if (!panning.current) return;
    setTransform((t) => ({ ...t, x: e.clientX - panning.current!.x, y: e.clientY - panning.current!.y }));
  }
  function onBgPointerUp() {
    panning.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setTransform((t) => {
      const k = Math.min(2.5, Math.max(0.3, t.k * (1 + delta)));
      const rect = containerRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nx = mx - (mx - t.x) * (k / t.k);
      const ny = my - (my - t.y) * (k / t.k);
      return { x: nx, y: ny, k };
    });
  }

  // Suppress unused warning
  void tick;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={onBgPointerDown}
      onPointerMove={onBgPointerMove}
      onPointerUp={onBgPointerUp}
      onPointerLeave={onBgPointerUp}
      onWheel={onWheel}
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {links.map((l, i) => {
            const s = l.source as Node;
            const t = l.target as Node;
            if (!s.x || !t.x) return null;
            const mx = (s.x + t.x) / 2;
            const my = (s.y! + t.y!) / 2 + 20;
            return (
              <path
                key={i}
                d={`M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`}
                stroke="url(#linkGrad)"
                strokeWidth={1.5}
                fill="none"
                opacity={0.5}
              />
            );
          })}
          <defs>
            <linearGradient id="linkGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.22 6)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="oklch(0.5 0.18 280)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </g>
      </svg>

      <div
        className="absolute inset-0"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: "0 0" }}
      >
        <AnimatePresence>
          {nodes.map((n) => {
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const isFounder = n.emp.is_founder;
            const size = isFounder ? 88 : 68;
            const isHover = hover === n.id;
            return (
              <motion.div
                key={n.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="absolute"
                style={{
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  touchAction: "none",
                }}
                onPointerDown={(e) => onPointerDownNode(e, n)}
                onPointerMove={(e) => onPointerMoveNode(e, n)}
                onPointerUp={(e) => onPointerUpNode(e, n)}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (drag) return;
                  onSelect(n.emp);
                }}
              >
                <div
                  className={`relative w-full h-full rounded-full overflow-hidden cursor-pointer transition-shadow ${
                    isFounder ? "ring-2 ring-primary" : "ring-1 ring-border"
                  }`}
                  style={{
                    boxShadow: isHover
                      ? "0 0 30px oklch(0.68 0.22 6 / 0.6), 0 8px 30px rgba(0,0,0,0.6)"
                      : "0 6px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  {n.emp.photo_url ? (
                    <img src={n.emp.photo_url} alt={n.emp.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground font-display text-xl">
                      {n.emp.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  {isFounder && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary pulse-dot" />
                  )}
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap pointer-events-none"
                  style={{ top: "100%" }}
                >
                  <div className="text-xs font-semibold text-foreground">{n.emp.name}</div>
                  {n.emp.position && (
                    <div className="text-[10px] text-muted-foreground text-center">{n.emp.position}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 glass rounded-lg p-1">
        <button
          className="w-8 h-8 rounded hover:bg-accent text-foreground"
          onClick={() => setTransform((t) => ({ ...t, k: Math.min(2.5, t.k * 1.2) }))}
        >+</button>
        <button
          className="w-8 h-8 rounded hover:bg-accent text-foreground"
          onClick={() => setTransform((t) => ({ ...t, k: Math.max(0.3, t.k / 1.2) }))}
        >−</button>
        <button
          className="w-8 h-8 rounded hover:bg-accent text-foreground text-xs"
          onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
        >⟲</button>
      </div>
    </div>
  );
}
