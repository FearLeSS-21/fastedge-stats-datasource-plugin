import React, { ChangeEvent, useRef, useState, useEffect, InputHTMLAttributes } from "react";
import { debounce } from "lodash";

interface GCInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  debounce?: number;
}

export const GCInput: React.FC<GCInputProps> = ({
  value: initialValue = "",
  onChange,
  debounce: delay = 500,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const debouncedChange = useRef(debounce((val: string) => onChange(val), delay)).current;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    debouncedChange(val);
  };

  return <input {...props} value={value} onChange={handleChange} />;
};
