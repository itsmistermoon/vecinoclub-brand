import { HexColorPicker, HexColorInput } from "react-colorful";
import { Popover } from "@base-ui/react/popover";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
const palette = [
  "#fb772a",
  "#f5f4f2",
  "#c6b29d",
  "#332f2a",
  "#27231e",
  "#211e1a",
  "#171717",
];
export function Color({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field orientation="horizontal" data-color-field={id}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="color-controls">
        <HexColorInput
          id={id}
          color={value}
          onChange={onChange}
          prefixed
          className="color-hex"
          aria-label={`${label} hexadecimal`}
        />
        <Popover.Root>
          <Popover.Trigger
            render={<Button variant="outline" size="icon" />}
            aria-label={`Elegir color: ${label}`}
            style={{ background: value }}
            className="color-swatch"
          />
          <Popover.Portal>
            <Popover.Positioner
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-50"
            >
              <Popover.Popup
                className="color-popover"
                aria-label={`Selector de color: ${label}`}
              >
                <Popover.Title className="text-sm font-medium">
                  {label}
                </Popover.Title>
                <HexColorPicker color={value} onChange={onChange} />
                <div className="color-palette" aria-label="Colores de marca">
                  {palette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Usar ${color}`}
                      style={{ background: color }}
                      onClick={() => onChange(color)}
                    />
                  ))}
                </div>
                <Popover.Close render={<Button variant="outline" size="sm" />}>
                  Listo
                </Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </Field>
  );
}
