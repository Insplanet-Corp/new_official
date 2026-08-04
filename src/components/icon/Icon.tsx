import { ICON_DATA, type IconName } from "./icon-data";

interface IconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
}

const Icon = ({
  name,
  size = 24,
  color = "currentColor",
  style,
}: IconProps) => {
  const icon = ICON_DATA[name];
  if (!icon) return null;
  return (
    <svg
      width={size}
      height={size}
      fill={color}
      style={style}
      aria-hidden="true"
      viewBox={icon.viewBox}
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
