import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
};

export default function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-sm";
  const styles =
    variant === "solid"
      ? "bg-primary text-champagne-100 hover:bg-champagne-accent focus:ring-accent"
      : "border border-champagne-200 text-champagne-contrast bg-champagne-100 hover:bg-champagne-200 focus:ring-accent";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
