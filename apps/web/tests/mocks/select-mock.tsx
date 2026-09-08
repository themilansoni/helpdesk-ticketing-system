import React from "react";

// Radix Select opens on pointerdown, which jsdom cannot simulate reliably
// even with polyfills, making it unusable in fast unit tests. This mock
// replaces the whole compound component with a single native <select> built
// from the same SelectContent/SelectItem children, so page-level tests can
// drive it with userEvent.selectOptions() the way a real browser (or an
// E2E test against the running app) would interact with any dropdown.

interface OptionInfo {
  value: string;
  label: string;
}

function extractOptions(node: React.ReactNode): OptionInfo[] {
  const options: OptionInfo[] = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: string; children?: React.ReactNode };
    if (props.value !== undefined && typeof props.children === "string") {
      options.push({ value: props.value, label: props.children });
    } else if (props.children) {
      options.push(...extractOptions(props.children));
    }
  });
  return options;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectItem({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectValue() {
  return null;
}
export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectTrigger({ children }: { children: React.ReactNode; className?: string; "aria-label"?: string }) {
  return <>{children}</>;
}

export function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  let contentChild: React.ReactElement<{ children?: React.ReactNode }> | null = null;
  let ariaLabel = "";

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectContent) contentChild = child as typeof contentChild;
    if (child.type === SelectTrigger) {
      ariaLabel = (child.props as { "aria-label"?: string })["aria-label"] ?? "";
    }
  });

  const options = contentChild ? extractOptions((contentChild as React.ReactElement<{ children?: React.ReactNode }>).props.children) : [];

  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      <option value="" disabled hidden />
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
