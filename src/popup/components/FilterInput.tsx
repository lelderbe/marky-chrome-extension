import type { ChangeEvent, Ref } from "react";

type FilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

export function FilterInput({ value, onChange, disabled, inputRef }: FilterInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      ref={inputRef}
      className="filter-input"
      type="text"
      placeholder={chrome.i18n.getMessage("filterPlaceholder")}
      aria-label={chrome.i18n.getMessage("filterPlaceholder")}
      disabled={disabled}
      value={value}
      onChange={handleChange}
      autoFocus
    />
  );
}
