import { ICON_DATA, type IconName } from "./icon-data";

interface IconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const Icon = ({
  name,
  size = 24,
  color = "currentColor",
  style,
  onClick,
}: IconProps) => {
  const icon = ICON_DATA[name];
  if (!icon) return null;
  return (
    <svg
      width={size}
      height={size}
      fill={color}
      style={{ ...style, ...(onClick && { cursor: "pointer" }) }}
      aria-hidden="true"
      viewBox={icon.viewBox}
      onClick={onClick}
    >
      {icon.paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      ))}
    </svg>
  );
};

export { Icon };
