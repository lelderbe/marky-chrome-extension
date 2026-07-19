import type { ChangeEvent } from "react";

type FilterInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function FilterInput({ value, onChange }: FilterInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      className="filter-input"
      type="text"
      placeholder="Filter..."
      value={value}
      onChange={handleChange}
      autoFocus
    />
  );
}
