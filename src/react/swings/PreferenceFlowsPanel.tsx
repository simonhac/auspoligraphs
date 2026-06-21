"use client";

import type {
  Party,
  PartyId,
  PreferenceFlows,
  ScenarioState,
} from "../../scenario/types";
import type { ScenarioAction } from "../../scenario/scenario";
import { FlowMatrixEditor } from "./FlowMatrixEditor";

export interface PreferenceFlowsPanelProps {
  flows: PreferenceFlows;
  scenario: ScenarioState;
  dispatch: (a: ScenarioAction) => void;
  parties: Record<PartyId, Party>;
  partyOrder: PartyId[];
}

/**
 * The preference-flow matrix as a standalone panel card. Pair with
 * {@link SwingPanel} (rendered with `hidePreferenceMatrix`) when you want the
 * flows to sit in their own card rather than alongside the swing sliders.
 */
export function PreferenceFlowsPanel({
  flows,
  scenario,
  dispatch,
  parties,
  partyOrder,
}: PreferenceFlowsPanelProps) {
  return (
    <div className="seats-panel" style={{ marginTop: 16 }}>
      <section>
        <div className="panel-head">
          <h2>Preference flows</h2>
        </div>
        <FlowMatrixEditor
          flows={flows}
          scenario={scenario}
          dispatch={dispatch}
          parties={parties}
          partyOrder={partyOrder}
        />
      </section>
    </div>
  );
}
