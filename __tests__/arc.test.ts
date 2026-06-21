import { describe, it, expect } from "vitest";
import { computeArcLayout, type Party } from "../src";

const AU_PREDICTED: Party[] = [
  { name: "Labor", color: "#E53935", seats: 76 },
  { name: "One Nation", color: "#F4831F", seats: 53 },
  { name: "Coalition", color: "#1565C0", seats: 12 },
  { name: "Independent", color: "#8C8C8C", seats: 8 },
  { name: "Katter's Australian Party", color: "#7B1F1F", seats: 1 },
];

const totalSeats = (parties: Party[]) =>
  parties.reduce((s, p) => s + Math.max(0, Math.floor(p.seats)), 0);

describe("computeArcLayout", () => {
  it("places exactly one dot per seat", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    expect(layout.seats).toHaveLength(totalSeats(AU_PREDICTED)); // 150
  });

  it("derives a sensible row count with a sparse inner arc (8 rows for 150 seats)", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    expect(layout.rows).toBe(8);
    // Inner arc is sparse, outer arc is full — matches the ABC original.
    expect(layout.seatsPerRow[0]).toBe(4);
    expect(layout.seatsPerRow[7]).toBe(33);
    expect(layout.seatsPerRow).toEqual([4, 8, 13, 17, 21, 25, 29, 33]);
    expect(layout.seatsPerRow.reduce((a, b) => a + b, 0)).toBe(150);
    expect(layout.seatsPerRow.every((n) => n > 0)).toBe(true);
  });

  it("matches the reference chart geometry (see tools/arc-fidelity)", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    // Reverse-engineered from the ABC reference: inner ring at 0.229·Rout,
    // dot radius 0.046·Rout. Verified to RMS 0.02% of the outer radius.
    expect(layout.innerRadius / layout.outerRadius).toBeCloseTo(0.229, 3);
    expect(layout.seatRadius / layout.outerRadius).toBeCloseTo(0.046, 3);
  });

  it("supports a proportional (equal-spacing) distribution", () => {
    const linear = computeArcLayout(AU_PREDICTED);
    const prop = computeArcLayout(AU_PREDICTED, { distribution: "proportional" });
    expect(prop.seats).toHaveLength(150);
    // Proportional packs more seats into the inner rows than linear does.
    expect(prop.seatsPerRow[0]).toBeGreaterThan(linear.seatsPerRow[0]);
    expect(prop.seatsPerRow.reduce((a, b) => a + b, 0)).toBe(150);
  });

  it("assigns each seat to the right party in input order", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    const counts = new Map<number, number>();
    for (const seat of layout.seats) {
      counts.set(seat.partyIndex, (counts.get(seat.partyIndex) ?? 0) + 1);
    }
    AU_PREDICTED.forEach((p, i) => expect(counts.get(i)).toBe(p.seats));
  });

  it("lays parties out left→right with contiguous angular wedges", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    // Seats are ordered left→right, so party indices never decrease.
    let prev = -1;
    for (const seat of layout.seats) {
      expect(seat.partyIndex).toBeGreaterThanOrEqual(prev);
      prev = seat.partyIndex;
    }
    // Angle is non-increasing across the ordering (π = left → 0 = right).
    for (let i = 1; i < layout.seats.length; i++) {
      expect(layout.seats[i].angle).toBeLessThanOrEqual(layout.seats[i - 1].angle + 1e-9);
    }
  });

  it("never overlaps dots", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    const minDist = 2 * layout.seatRadius - 1e-6;
    for (let i = 0; i < layout.seats.length; i++) {
      for (let j = i + 1; j < layout.seats.length; j++) {
        const a = layout.seats[i];
        const b = layout.seats[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        expect(dist).toBeGreaterThanOrEqual(minDist);
      }
    }
  });

  it("keeps every dot within the semicircle bounds", () => {
    const layout = computeArcLayout(AU_PREDICTED);
    for (const seat of layout.seats) {
      const rho = Math.hypot(seat.x, seat.y);
      expect(rho).toBeLessThanOrEqual(layout.outerRadius + 1e-6);
      expect(rho).toBeGreaterThanOrEqual(layout.innerRadius - 1e-6);
      expect(seat.y).toBeLessThanOrEqual(1e-6); // upper half only
    }
  });

  it("respects an explicit row override", () => {
    const layout = computeArcLayout(AU_PREDICTED, { rows: 4 });
    expect(layout.rows).toBe(4);
    expect(layout.seats).toHaveLength(150);
  });

  it("handles edge cases", () => {
    expect(computeArcLayout([]).seats).toHaveLength(0);
    expect(computeArcLayout([{ name: "Solo", color: "#000", seats: 1 }]).seats).toHaveLength(1);

    const oneParty = computeArcLayout([{ name: "All", color: "#000", seats: 30 }]);
    expect(oneParty.seats).toHaveLength(30);
    expect(oneParty.seats.every((s) => s.partyIndex === 0)).toBe(true);

    // Floors non-integers, ignores negatives.
    const messy = computeArcLayout([
      { name: "A", color: "#000", seats: 5.9 },
      { name: "B", color: "#111", seats: -3 },
    ]);
    expect(messy.seats).toHaveLength(5);
  });

  describe("corridor mode", () => {
    it("splits an even chamber into exactly equal halves with an empty aisle", () => {
      const layout = computeArcLayout(AU_PREDICTED, { corridor: true });
      const left = layout.seats.filter((s) => s.x < -1e-9).length;
      const right = layout.seats.filter((s) => s.x > 1e-9).length;
      const onAxis = layout.seats.filter((s) => Math.abs(s.x) <= 1e-9).length;
      expect(left).toBe(75);
      expect(right).toBe(75);
      expect(onAxis).toBe(0);
    });

    it("opens/closes the aisle without reflowing seats between rows", () => {
      const off = computeArcLayout(AU_PREDICTED);
      const on = computeArcLayout(AU_PREDICTED, { corridor: true });
      expect(on.seatsPerRow).toEqual(off.seatsPerRow);
      expect(on.rows).toBe(off.rows);
    });

    it("leaves a real gap down the middle", () => {
      const layout = computeArcLayout(AU_PREDICTED, { corridor: true });
      const minAbsX = Math.min(...layout.seats.map((s) => Math.abs(s.x)));
      // The nearest dot to the axis is clear of it by a visible margin.
      expect(minAbsX).toBeGreaterThan(layout.seatRadius);
    });

    it("never overlaps dots with the corridor open", () => {
      const layout = computeArcLayout(AU_PREDICTED, { corridor: true });
      const minDist = 2 * layout.seatRadius - 1e-6;
      for (let i = 0; i < layout.seats.length; i++) {
        for (let j = i + 1; j < layout.seats.length; j++) {
          const a = layout.seats[i];
          const b = layout.seats[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(minDist);
        }
      }
    });

    it("ignores the corridor for an odd chamber (identical to corridor off)", () => {
      const odd: Party[] = [{ name: "A", color: "#000", seats: 51 }];
      const off = computeArcLayout(odd);
      const on = computeArcLayout(odd, { corridor: true });
      expect(on.seats.map((s) => [s.x, s.y])).toEqual(off.seats.map((s) => [s.x, s.y]));
    });

    it("handles tiny and empty chambers", () => {
      const two = computeArcLayout([{ name: "A", color: "#000", seats: 2 }], { corridor: true });
      expect(two.seats.filter((s) => s.x < 0)).toHaveLength(1);
      expect(two.seats.filter((s) => s.x > 0)).toHaveLength(1);
      expect(computeArcLayout([], { corridor: true }).seats).toHaveLength(0);
    });
  });

  it("scales to a large parliament (UK House of Commons, 650 seats)", () => {
    const uk: Party[] = [
      { name: "Labour", color: "#E4003B", seats: 411 },
      { name: "Conservative", color: "#0087DC", seats: 121 },
      { name: "Lib Dem", color: "#FAA61A", seats: 72 },
      { name: "Others", color: "#888", seats: 46 },
    ];
    const layout = computeArcLayout(uk);
    expect(layout.seats).toHaveLength(650);
    expect(layout.seatsPerRow.reduce((a, b) => a + b, 0)).toBe(650);
    expect(layout.seatsPerRow.every((n) => n > 0)).toBe(true);
  });
});
