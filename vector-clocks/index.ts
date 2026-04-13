type ProcessId = string;

type RawClock = Map<ProcessId, number>;

export class VectorClock {
  private clock: RawClock;
  readonly processId: ProcessId;

  constructor(processId: ProcessId, initial?: RawClock) {
    this.processId = processId;
    this.clock = initial ? new Map(initial) : new Map();

    if (!this.clock.has(processId)) {
      this.clock.set(processId, 0);
    }
  }

  // Get component for a process (0 if process not seen yet)
  get(processId: ProcessId) {
    return this.clock.get(processId) ?? 0;
  }

  // Increment own component — call on every local event
  tick(): VectorClock {
    this.clock.set(this.processId, this.get(this.processId) + 1);
    return this;
  }

  // Create a copy to attach to outgoing messages
  snapshot() {
    return new Map(this.clock);
  }

  // Get component for a process (0 if process not seen yet)
  send(): ReturnType<typeof this.snapshot> {
    this.tick();
    return this.snapshot();
  }

  // Receive: component-wise max (merge causal histories) then tick
  receive(incoming: RawClock) {
    for (const [pid, time] of incoming) {
      this.clock.set(pid, Math.max(this.get(pid), time));
    }

    this.tick(); // the receive itself is an event
  }

  // Checks if A happened before B. The comparison operators that detect causality
  // Returns true if this clock happened-before other: every component <= other's, at least one strictly <
  happenedBefore(otherClock: VectorClock): boolean {
    let atleastOneStrictlyLess = false;

    const allProcesses = new Set([
      ...this.clock.keys(),
      ...otherClock.clock.keys(),
    ]);

    for (let pid of allProcesses) {
      const a = this.get(pid);
      const b = otherClock.get(pid);

      if (a > b) {
        return false; // If ANY component (time) is greater, then this can't happen before
      }

      if (a < b) {
        atleastOneStrictlyLess = true;
      }
    }

    return atleastOneStrictlyLess;
  }

  // Returns true if the clocks are identical (same causal history)
  equals(otherClock: VectorClock): boolean {
    const allProcesses = new Set([
      ...this.clock.keys(),
      ...otherClock.clock.keys(),
    ]);

    for (let pid of allProcesses) {
      const a = this.get(pid);
      const b = otherClock.get(pid);

      if (a !== b) {
        return false;
      }
    }

    return true;
  }

  // Returns true if these clocks represent concurrent (causally independent) events
  isConcurrentWith(otherClock: VectorClock): boolean {
    return (
      !this.happenedBefore(otherClock) &&
      !otherClock.happenedBefore(this) &&
      !this.equals(otherClock)
    );
  }

  // Merge two clocks — computes the least upper bound (join) of their causal histories
  static merge(
    a: VectorClock,
    b: VectorClock,
    mergedProcessId: ProcessId,
  ): VectorClock {
    const allProcesses = new Set([...a.clock.keys(), ...b.clock.keys()]);

    const mergedClock: RawClock = new Map();

    for (let pid of allProcesses) {
      mergedClock.set(pid, Math.max(a.get(pid), b.get(pid)));
    }

    return new VectorClock(mergedProcessId, mergedClock);
  }

  toString(): string {
    const entries = [...this.clock.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([pid, time]) => `${pid}:${time}`);
    return `{${entries.join(", ")}}`;
  }
}
