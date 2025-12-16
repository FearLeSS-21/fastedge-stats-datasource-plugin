import React, { useState } from "react";
import { GCVariableQuery } from "../types";

export interface GCVariableQueryProps {
  query: GCVariableQuery;
  onChange: (query: GCVariableQuery, definition: string) => void;
}

export const GCVariableQueryEditor: React.FC<GCVariableQueryProps> = ({ query: rawQuery, onChange }) => {
  const [step, setStep] = useState<number>(rawQuery.selector ?? 60);

  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) || 0;
    setStep(value);
    onChange({ ...rawQuery, selector: value }, `${value} seconds`);
  };

  return (
    <div className="gf-form" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <label className="gf-form-label width-10">Step</label>
      <input
        type="number"
        value={step}
        onChange={handleStepChange}
        placeholder="Enter step in seconds"
        style={{
          width: "120px",
          height: "30px",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "14px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
};
