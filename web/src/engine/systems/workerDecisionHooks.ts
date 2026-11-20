/**
 * Finish 4.0 Phase 5 — explainable worker AI decision traces (TS mirror of Kotlin WorkerDecisionHooks).
 * Finish 4.0 Phase 19 adds wave-2 reasons: trophy_cast_bias, line_pro_stock,
 * dock_relay, cargo_sprint_urgency, quick_till_queue.
 * Finish 5.0 Phase 20 adds wave-3 reasons: rush_marshal_patrol, circuit_boss_link,
 * smoke_queue_feed, schedule_daypart_boost, failure_recover.
 * Finish 6.0 Phase 16 adds wave-4 reasons: nest_chill_chain, nest_host_welcome,
 * nest_haul_urgency, schedule_nest_ember_boost, nest_decision_fixture
 * (see decision-traces-staff-ai-4 fixtures).
 */
export interface WorkerDecisionTrace {
  workerId: string;
  role: string;
  kind: string;
  reason: string;
  score: number | null;
  candidatesConsidered: number;
  tick: number;
}

const MAX_TRACES = 32;
let lastTraces: WorkerDecisionTrace[] = [];

export const WorkerDecisionHooks = {
  get lastTraces(): readonly WorkerDecisionTrace[] {
    return lastTraces;
  },
  record(trace: WorkerDecisionTrace): void {
    lastTraces = [...lastTraces, trace];
    if (lastTraces.length > MAX_TRACES) lastTraces = lastTraces.slice(-MAX_TRACES);
  },
  clear(): void {
    lastTraces = [];
  },
  lastForWorker(workerId: string): WorkerDecisionTrace | null {
    for (let i = lastTraces.length - 1; i >= 0; i--) {
      if (lastTraces[i]!.workerId === workerId) return lastTraces[i]!;
    }
    return null;
  },
};
