import { VectorClock } from "./index";

function vectorClockDemo(): void {
  const alice = new VectorClock("alice");
  const bob = new VectorClock("bob");
  const carol = new VectorClock("carol");

  // Alice writes x=1 (local event)
  alice.tick();
  console.log(`Alice writes x=1  | clock: ${alice}`); // {alice:1}

  // Alice sends a message to Bob
  const msg1 = alice.send(); // alice ticks to 2, sends {alice:2}
  console.log(`Alice sends msg1  | clock: ${alice}`); // {alice:2}

  // Bob does independent work BEFORE receiving Alice's message
  bob.tick();
  const bobBeforeReceive = new VectorClock("bob", bob.snapshot());
  console.log(`Bob local work    | clock: ${bob}`); // {bob:1}

  // Bob receives Alice's message — his clock merges with Alice's history
  bob.receive(msg1);
  console.log(`Bob receives msg1 | clock: ${bob}`); // {alice:2, bob:3}
  // Bob now knows: Alice had at least 2 events. He's had 3 events total.

  // Carol does independent work — no messages to or from anyone
  carol.tick();
  carol.tick();
  console.log(`Carol local work  | clock: ${carol}`); // {carol:2}

  // === Now let's use comparison operators to detect causal relationships ===

  const aliceWrite = new VectorClock("alice", new Map([["alice", 1]]));
  const bobRecv = new VectorClock("bob", bob.snapshot());

  // Did Alice's write happen before Bob's receive?
  console.log(
    `\nAlice write -> Bob receive? ${aliceWrite.happenedBefore(bobRecv)}`,
  ); // true — there's a causal chain (Alice sent a message that Bob received)

  console.log(
    `Bob receive -> Alice write? ${bobRecv.happenedBefore(aliceWrite)}`,
  ); // false — causality doesn't flow backward

  // Was Bob's local work concurrent with Alice's write?
  const bobLocal = bobBeforeReceive;
  console.log(
    `\nBob local || Alice write? ${bobLocal.isConcurrentWith(aliceWrite)}`,
  ); // TRUE! Neither happened before the other. They're causally independent.
  // A Lamport clock would give them both timestamp 1 and you'd have no idea
  // whether they're causally related. Vector clocks KNOW they're concurrent.

  // Is Carol concurrent with everyone?
  console.log(`Carol || Alice? ${carol.isConcurrentWith(aliceWrite)}`); // true — Carol has no causal connection to Alice
  console.log(`Carol || Bob?   ${carol.isConcurrentWith(bobRecv)}`); // true — Carol has no causal connection to Bob

  // === Why this matters for real systems ===
  // Imagine Alice and Carol both wrote to key "x":
  //   Alice: x=1 at {alice:1}
  //   Carol: x=2 at {carol:2}
  //
  // Vector clock comparison: CONCURRENT! Neither happened-before.
  // This is a CONFLICT. The system must resolve it:
  //   - Last-writer-wins? (Which "last"? Their clocks are incomparable!)
  //   - Merge the values? (Application-specific merge function)
  //   - Return both versions and let the client decide? (Riak's approach)
  //
  // A Lamport clock would give them arbitrary timestamps and you'd silently
  // pick one as the "winner." The other write is gone. Silent data loss.
  // Vector clocks detect the conflict so you can handle it correctly.
}

vectorClockDemo();
